// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

interface SolarOCRPayload {
  action: string;
  agent_id: string;
  lead_id?: string;
  property_id?: string;
  document_url?: string; // URL to PDF or image file
  document_base64?: string; // Base64-encoded PDF or image
  vendor?: string; // e.g., "Sunrun", "Tesla Energy", "Vivint Solar"
}

interface ExtractedSolarData {
  monthly_payment?: number;
  escalator_clause?: boolean;
  escalator_pct?: number;
  buyout_amount?: number;
  transfer_fee?: number;
  vendor?: string;
  contract_type?: "lease" | "ppa" | "loan" | "unknown";
  lease_term_years?: number;
  extracted_text?: string;
  confidence_score?: number;
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "Content-Type": "application/json" } });
}

/**
 * Extract solar contract fields using Google Gemini 1.5 Flash Vision API
 */
async function extractSolarContractData(documentBase64: string, mimeType: string, vendor?: string): Promise<ExtractedSolarData> {
  const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_KEY not configured");
  }

  // Convert MIME type to Gemini format
  const geminiMimeType = mimeType === "application/pdf" ? "application/pdf" : 
                         mimeType.startsWith("image/") ? mimeType : "image/jpeg";

  const extractionPrompt = `Analyze this solar contract or agreement and extract the following financial terms. Return ONLY a JSON object with these exact fields (use null for missing values):

{
  "monthly_payment": <number or null>,
  "escalator_clause": <true/false>,
  "escalator_pct": <number or null>,
  "buyout_amount": <number or null>,
  "transfer_fee": <number or null>,
  "lease_term_years": <number or null>,
  "contract_type": "<lease|ppa|loan|unknown>",
  "vendor": "<vendor name or null>",
  "confidence_score": <0.0-1.0>
}

Focus on:
- Monthly payment amount (numeric only, no currency symbol)
- Annual escalator/increase percentage
- Buyout/buydown amount to purchase system
- Transfer or assumption fees
- Lease term in years
- Contract type (lease, PPA/power purchase agreement, loan, or unknown)
- Vendor name (Sunrun, Tesla, Vivint, Sunnova, etc.)

If any field is unclear or missing, use null. Set confidence_score to your confidence level (0.0-1.0).`;

  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const requestBody = {
    contents: [
      {
        parts: [
          { text: extractionPrompt },
          {
            inlineData: {
              mimeType: geminiMimeType,
              data: documentBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3, // Low temperature for factual extraction
      topK: 1,
    },
  };

  const geminiResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    console.error("Gemini API error:", errText);
    throw new Error(`Gemini Vision API failed: ${geminiResponse.statusText}`);
  }

  const geminiResult = await geminiResponse.json();
  const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse Gemini's JSON response
  const extracted = parseGeminiResponse(responseText, vendor);
  return extracted;
}

/**
 * Parse Document AI response to extract solar contract fields
 */
function parseDocumentAIResponse(document: unknown, vendor?: string): ExtractedSolarData {
  const doc = document as {
    text?: string;
    entities?: Array<{
      type?: string;
      textAnchor?: { textSegments?: Array<{ startIndex?: number; endIndex?: number }> };
      confidence?: number;
      mentionText?: string;
      normalizedValue?: { text?: string };
    }>;
  };

  const extractedText = doc.text ?? "";
  const entities = doc.entities ?? [];

  let result: ExtractedSolarData = {
    vendor: vendor ?? "unknown",
    confidence_score: 0.5,
    extracted_text: extractedText.substring(0, 500),
  };

  // Map Document AI entity types to our fields
  for (const entity of entities) {
    const type = entity.type?.toLowerCase() ?? "";
    const value = entity.mentionText ?? entity.normalizedValue?.text ?? "";
    const confidence = entity.confidence ?? 0;

    // Monthly payment (look for "monthly_payment", "monthly_charge", "payment_amount")
    if (
      type.includes("monthly") ||
      type.includes("payment") ||
      type.includes("charge")
    ) {
      const amount = parseFloat(value.replace(/[^\d.]/g, ""));
      if (!isNaN(amount)) {
        result.monthly_payment = amount;
      }
    }

    // Escalator clause (look for "escalator", "increase", "annual_increase")
    if (type.includes("escalator") || type.includes("increase")) {
      result.escalator_clause = true;
      const pctMatch = value.match(/(\d+\.?\d*)\s*%/);
      if (pctMatch) {
        result.escalator_pct = parseFloat(pctMatch[1]);
      }
    }

    // Buyout amount (look for "buyout", "system_cost", "purchase_price")
    if (
      type.includes("buyout") ||
      type.includes("system") ||
      type.includes("purchase")
    ) {
      const amount = parseFloat(value.replace(/[^\d.]/g, ""));
      if (!isNaN(amount)) {
        result.buyout_amount = amount;
      }
    }

    // Transfer fee (look for "transfer_fee", "assumption_fee")
    if (type.includes("transfer") || type.includes("assumption")) {
      const amount = parseFloat(value.replace(/[^\d.]/g, ""));
      if (!isNaN(amount)) {
        result.transfer_fee = amount;
      }
    }

    // Lease term (look for "lease_term", "term_years")
    if (type.includes("lease_term") || type.includes("term")) {
      const years = parseFloat(value.replace(/[^\d.]/g, ""));
      if (!isNaN(years)) {
        result.lease_term_years = years;
      }
    }

    // Contract type (look for "contract_type", "agreement_type")
    if (type.includes("contract_type") || type.includes("agreement_type")) {
      const lower = value.toLowerCase();
      if (lower.includes("lease")) {
        result.contract_type = "lease";
      } else if (lower.includes("ppa") || lower.includes("power purchase")) {
        result.contract_type = "ppa";
      } else if (lower.includes("loan") || lower.includes("financing")) {
        result.contract_type = "loan";
      }
    }

    // Update confidence (use average of detected entities)
    if (confidence > result.confidence_score!) {
      result.confidence_score = confidence;
    }
  }

  // Fallback: basic pattern matching if Document AI didn't extract well
  if (!result.monthly_payment && extractedText) {
    const paymentMatch = extractedText.match(/monthly.*?[\$]?([\d,]+\.?\d*)/i);
    if (paymentMatch) {
      result.monthly_payment = parseFloat(paymentMatch[1].replace(/,/g, ""));
    }
  }

  if (!result.escalator_pct && extractedText) {
    const escalatorMatch = extractedText.match(/escalat.*?(\d+\.?\d*)\s*%/i);
    if (escalatorMatch) {
      result.escalator_clause = true;
      result.escalator_pct = parseFloat(escalatorMatch[1]);
    }
  }

  return result;
}

/**
 * Create a JWT for GCP service account authentication
 */
async function createJWT(serviceAccount: {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = await signJWT(`${headerEncoded}.${payloadEncoded}`, serviceAccount.private_key ?? "");

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Sign JWT with RSA private key
 */
async function signJWT(message: string, privateKey: string): Promise<string> {
  // Import the private key
  const keyLines = privateKey
    .split("\n")
    .filter((line) => !line.includes("-----"));
  const keyString = keyLines.join("");
  const binaryString = atob(keyString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(message)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  let signatureString = "";
  for (let i = 0; i < signatureArray.length; i++) {
    signatureString += String.fromCharCode(signatureArray[i]);
  }
  return btoa(signatureString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Fetch PDF/image from URL and convert to base64 with MIME type detection
 */
async function fetchDocumentAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  // Detect MIME type from content-type header or URL extension
  const contentType = response.headers.get("content-type") ?? "";
  let mimeType = contentType.split(";")[0].trim() || "application/octet-stream";

  // Fallback: infer from URL extension
  if (mimeType === "application/octet-stream") {
    if (url.toLowerCase().endsWith(".pdf")) {
      mimeType = "application/pdf";
    } else if (url.toLowerCase().endsWith(".png")) {
      mimeType = "image/png";
    } else if (url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { base64: btoa(binary), mimeType };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = (await req.json()) as SolarOCRPayload;
    const { action, agent_id, lead_id, property_id, document_url, document_base64, vendor } = payload;

    if (!action || !agent_id) {
      return json({ error: "Missing action or agent_id" }, 400);
    }

    if (!lead_id && !property_id) {
      return json({ error: "lead_id or property_id required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    switch (action) {
      case "solar.lease.scan": {
        // Validate input
        if (!document_url && !document_base64) {
          return json({ error: "document_url or document_base64 required" }, 400);
        }

        let imageBase64 = document_base64;
        let mimeType = "application/pdf"; // default

        if (!imageBase64 && document_url) {
          // Fetch and convert URL to base64
          const result = await fetchDocumentAsBase64(document_url);
          imageBase64 = result.base64;
          mimeType = result.mimeType;
        }

        if (!imageBase64) {
          return json({ error: "Could not process document" }, 400);
        }

        // Extract fields using Google Cloud Document AI
        const extracted = await extractSolarContractData(imageBase64, mimeType, vendor);

        // Build risk assessment payload
        const assessment_json = {
          extraction_method: "google-document-ai",
          extracted_fields: extracted,
          scan_timestamp: new Date().toISOString(),
        };

        // Calculate risk level based on escalator clause and high monthly payment
        let risk_level: "low" | "medium" | "high" = "medium";
        if (extracted.escalator_clause && extracted.escalator_pct && extracted.escalator_pct > 2) {
          risk_level = "high";
        }
        if (extracted.monthly_payment && extracted.monthly_payment > 300) {
          risk_level = "high";
        }

        // Upsert risk assessment
        const assessment = {
          agent_id,
          lead_id: lead_id ?? null,
          property_id: property_id ?? null,
          solar_status: extracted.contract_type === "lease" ? ("leased" as const) : ("owned" as const),
          solar_escalator: extracted.escalator_clause ?? false,
          solar_escalator_pct: extracted.escalator_pct ?? null,
          solar_monthly_payment: extracted.monthly_payment ?? null,
          solar_buyout_amount: extracted.buyout_amount ?? null,
          solar_transfer_fee: extracted.transfer_fee ?? null,
          risk_level,
          assessment_json,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from("risk_assessments")
          .insert(assessment)
          .select("id");

        if (insertErr) {
          console.error("Insert risk_assessment failed:", insertErr);
          return json({ error: insertErr.message }, 400);
        }

        // Track usage for billing
        await supabase.from("agent_usage_metrics").insert({
          agent_id,
          metric_type: "solar_ocr_scan",
          metric_value: 1,
          cost_usd: 0.075, // Gemini cost per scan
          lead_id: lead_id ?? null,
          property_id: property_id ?? null,
          metadata: { vendor, extraction_method: "google-gemini-vision" },
        });

        return json({
          ok: true,
          risk_assessment_id: inserted?.[0]?.id,
          extracted_data: extracted,
          risk_level,
          assessment_json,
        });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("solar-ocr-scanner error:", err);
    return json({ error: msg }, 500);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with base64-encoded image:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/solar-ocr-scanner' \
    --header 'Content-Type: application/json' \
    --data '{
      "action": "solar.lease.scan",
      "agent_id": "<agent-uuid>",
      "lead_id": "<lead-uuid>",
      "document_base64": "<base64-encoded-pdf-or-image>",
      "vendor": "Sunrun"
    }'

  Or with a URL:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/solar-ocr-scanner' \
    --header 'Content-Type: application/json' \
    --data '{
      "action": "solar.lease.scan",
      "agent_id": "<agent-uuid>",
      "property_id": "<property-uuid>",
      "document_url": "https://example.com/contract.pdf",
      "vendor": "Tesla Energy"
    }'

*/
