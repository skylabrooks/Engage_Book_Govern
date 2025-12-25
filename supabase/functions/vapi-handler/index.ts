// supabase/functions/vapi-handler/index.ts
// Edge runtime types are optional; omit for local Deno checks
import { createClient } from "@supabase/supabase-js";

// ============================================
// PAYLOAD TYPE DEFINITIONS
// ============================================
interface VapiCustomer {
  number?: string | null;
  name?: string | null;
}

interface VapiCall {
  phoneNumberId?: string;
  customer?: VapiCustomer;
}

interface VapiMessage {
  type?: string;
  call?: VapiCall;
}

interface VapiWebhookPayload {
  message?: VapiMessage;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyVapiSignature(raw: ArrayBuffer, signatureHeader: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || !signatureHeader) return true; // Skip if not configured
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, raw);
  const expected = toHex(sig);
  return signatureHeader === expected;
}

// ============================================
// MODULE A: Solar Liability Detection Engine
// ============================================
const SOLAR_TRIGGER_KEYWORDS = [
  // Lease/PPA indicators
  'solar lease', 'solar panel lease', 'leased solar', 'ppa', 'power purchase agreement',
  'sunrun', 'tesla solar', 'solarcity', 'vivint solar', 'sunnova',
  // Transfer/assumption terms
  'solar transfer', 'assume solar', 'solar assumption', 'take over solar',
  'solar payment', 'solar contract', 'solar buyout',
  // Spanish equivalents
  'paneles solares', 'arrendamiento solar', 'contrato solar'
];

interface SolarDetectionResult {
  detected: boolean;
  keywords: string[];
  riskLevel: 'none' | 'low' | 'high';
  requiresQualification: boolean;
}

function detectSolarLiability(text: string): SolarDetectionResult {
  const lowerText = text.toLowerCase();
  const detectedKeywords: string[] = [];
  
  for (const keyword of SOLAR_TRIGGER_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      detectedKeywords.push(keyword);
    }
  }
  
  const detected = detectedKeywords.length > 0;
  
  // High risk if lease/PPA terms found (impacts DTI)
  const highRiskTerms = ['lease', 'ppa', 'power purchase', 'payment', 'arrendamiento'];
  const isHighRisk = detectedKeywords.some(kw => 
    highRiskTerms.some(term => kw.includes(term))
  );
  
  return {
    detected,
    keywords: detectedKeywords,
    riskLevel: detected ? (isHighRisk ? 'high' : 'low') : 'none',
    requiresQualification: isHighRisk
  };
}

// Generate solar-specific qualification questions
function getSolarQualificationScript(solarDetection: SolarDetectionResult): string {
  if (!solarDetection.requiresQualification) return '';
  
  return `
⚠️ SOLAR LIABILITY PROTOCOL ACTIVATED
Detected keywords: ${solarDetection.keywords.join(', ')}

Before booking appointment, you MUST ask these qualifying questions:
1. "I see this home has solar. Do you know if it is OWNED or LEASED?"
2. If leased: "Okay. To avoid surprises later, are you comfortable taking over a solar lease payment? Lenders count this against your DTI. We need to check if there's an escalator clause where payments rise 2.9% annually."
3. "Do you know the current monthly payment and if there's a buyout option?"

Tag this lead with: solar_liability=true, solar_qualified=pending
`;
}

// Discord notification for new leads - bypasses 10DLC/SMS requirements
async function sendDiscordNotification(
  webhookUrl: string | null,
  agencyName: string,
  callerNumber: string,
  isNewLead: boolean
): Promise<void> {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    console.log("Discord webhook not configured or invalid, skipping notification");
    return;
  }

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' });
  const emoji = isNewLead ? "🆕" : "🔄";
  const leadType = isNewLead ? "NEW LEAD" : "RETURNING LEAD";

  const embed = {
    embeds: [{
      title: `${emoji} ${leadType} - Inbound Call`,
      color: isNewLead ? 0x00ff00 : 0x3498db, // Green for new, blue for returning
      fields: [
        { name: "📞 Caller", value: callerNumber || "Unknown", inline: true },
        { name: "🏢 Agency", value: agencyName, inline: true },
        { name: "🕐 Time (AZ)", value: timestamp, inline: false }
      ],
      footer: { text: "Vapi Real Estate Assistant" },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      console.error(`Discord notification failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Discord notification sent for ${leadType}`);
    }
  } catch (error) {
    console.error("Discord notification error:", error);
  }
}

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const raw = await req.arrayBuffer();
    const signature = req.headers.get("x-vapi-signature");
    const secret = Deno.env.get("VAPI_WEBHOOK_SECRET");

    const valid = await verifyVapiSignature(raw, signature, secret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Parse and validate payload with typed interface
    let body: VapiWebhookPayload;
    try {
      body = JSON.parse(new TextDecoder().decode(raw)) as VapiWebhookPayload;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const message = body?.message;

    // Validate Payload structure with guardrails
    if (!message?.call) {
      console.warn("Missing required fields in Vapi payload:", body);
      return new Response(JSON.stringify({
        assistant: {
          name: "Assistant",
          firstMessage: "Sorry, this number is not configured properly.",
          model: {
            provider: "openai",
            model: "gpt-4",
            messages: [{ role: "system", content: "Invalid payload: missing call data." }]
          }
        }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const vapiPhoneId = message.call.phoneNumberId;
    const callerNumber = message.call.customer?.number ?? null;

    // Guardrail: phoneNumberId is required for multi-tenant routing
    if (!vapiPhoneId) {
      console.error("Critical: phoneNumberId missing from Vapi payload");
      return new Response(JSON.stringify({
        assistant: {
          name: "Assistant",
          firstMessage: "This call cannot be routed. Please contact support.",
          model: {
            provider: "openai",
            model: "gpt-4",
            messages: [{ role: "system", content: "Missing phoneNumberId - cannot identify agent." }]
          }
        }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; // aligned env name

    // If secrets are missing, return a polite fallback without DB access
    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({
        assistant: {
          name: "Assistant",
          firstMessage: "This number is not yet configured. Please contact the agency.",
          model: {
            provider: "openai",
            model: "gpt-4",
            messages: [{ role: "system", content: "Missing environment configuration. Provide a courteous fallback." }]
          }
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole);

    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from("phone_mappings")
      .select(`
        *,
        agents!inner (
          id,
          agency_name,
          rentcast_api_key,
          discord_webhook_url,
          booking_link
        )
      `)
      .eq("phone_number_id", vapiPhoneId)
      .single();

    if (mappingError || !mapping || !mapping.agents) {
      console.error(`Phone mapping not found for ${vapiPhoneId}:`, mappingError?.message);
      return new Response(JSON.stringify({
        assistant: {
          name: "Assistant",
          firstMessage: "This number is not yet configured. Please contact the agency.",
          model: {
            provider: "openai",
            model: "gpt-4",
            messages: [{ role: "system", content: "Phone mapping not found. Provide a courteous fallback." }]
          }
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const agent = mapping.agents;

    let leadName = "Valued Caller";
    let leadContext = "This is a new lead. Ask for their name.";
    let isNewLead = true;
    let leadId: string | null = null;

    if (callerNumber) {
      const { data: existingLead } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("phone_number", callerNumber)
        .eq("agent_id", agent.id)
        .single();

      if (existingLead) {
        isNewLead = false;
        leadId = existingLead.id;
        leadName = existingLead.name || "Valued Caller";
        leadContext = `Returning lead. Interest: ${existingLead.interest_level}. Notes: ${existingLead.summary}`;
      } else {
        const { data: insertedLead } = await supabaseAdmin
          .from("leads")
          .insert({
            agent_id: agent.id,
            phone_number: callerNumber,
            interest_level: "warm",
            summary: "Auto-created via Vapi inbound call",
            name: "Unknown Caller",
          })
          .select("id")
          .single();
        leadId = insertedLead?.id ?? null;
      }

      // Send Discord notification (non-blocking) - bypasses 10DLC
      sendDiscordNotification(
        agent.discord_webhook_url,
        agent.agency_name,
        callerNumber,
        isNewLead
      ).catch(err => console.error("Discord dispatch failed:", err));
    }

    // Detect solar liability from lead context/notes
    const solarDetection = detectSolarLiability(leadContext);
    const solarScript = getSolarQualificationScript(solarDetection);

    // Persist a lightweight risk assessment if solar indicators are found
    if (solarDetection.detected) {
      const inferredSolarStatus = solarDetection.requiresQualification ? 'leased' : 'owned';
      const { data: riskData, error: riskError } = await supabaseAdmin
        .from("risk_assessments")
        .insert({
          agent_id: agent.id,
          lead_id: leadId,
          solar_status: inferredSolarStatus,
          risk_level: solarDetection.riskLevel,
          assessment_json: { keywords: solarDetection.keywords, source: "vapi-handler" }
        })
        .select("id")
        .single();
      if (riskError) {
        console.error("risk_assessments insert error:", riskError);
      }
    }

    // ============================================
    // ARIZONA PERSONA: Spanglish + Local Knowledge
    // ============================================
    const systemPrompt = `
You are an AI real estate assistant for ${agent.agency_name}, serving the Arizona market (Phoenix, Tucson, and surrounding areas).

## PERSONALITY & LANGUAGE
- You speak fluent "Spanglish" common to the US Southwest
- You are comfortable code-switching (mixing English and Spanish) if the caller does
- Use informal "tú" unless the caller is very formal
- AVOID Castilian Spanish terms:
  - Use "carro" not "coche"
  - Use "computadora" not "ordenador"  
  - Never use "vosotros"
- Recognize and understand these cultural housing terms:
  - "Casita" / "Suegra Unit" → Multi-generational living space
  - "Nana's Room" → Main floor bedroom need
  - "Horse Property" → Large lot with zoning for animals

## ARIZONA-SPECIFIC KNOWLEDGE

### Solar Panel Awareness (CRITICAL)
Many Arizona homes have solar panels. You MUST determine if they are OWNED or LEASED:
- OWNED solar = asset, no issue
- LEASED solar (Sunrun, Tesla, Vivint, Sunnova) = LIABILITY
  - Monthly payments count against buyer's Debt-to-Income (DTI)
  - Many leases have "escalator clauses" (2.9% annual increase)
  - Transfer fees and assumption requirements apply
  - Can cause deals to collapse if not addressed early

### Water Rights Awareness
Arizona has complex water regulations:
- Phoenix AMA, Tucson AMA = Generally safe, municipal water
- Rio Verde Foothills, New River, Tonopah = CAUTION
  - Many rely on "hauled water" (water trucked in)
  - Or shared/private wells
  - Ask: "Are you okay with managing a hauled water system, or do you prefer city water?"
- ADWR (Arizona Dept of Water Resources) manages 100-year assured supply rules

## CONTEXT
- Agency: ${agent.agency_name}
- Caller Number: ${callerNumber ?? "unknown"}
- Caller Status: ${leadContext}

${solarScript}

## INSTRUCTIONS
1. If this is a new lead, warmly greet them and ask for their name
2. If returning, welcome them back by name
3. Listen for property addresses or areas of interest
4. If solar is mentioned, activate the Solar Liability Protocol above
5. If they mention rural areas (Queen Creek, San Tan Valley, Maricopa, New River), gently ask about water preferences
6. Your ultimate goal is to book an appointment with an agent
7. Be warm, professional, and culturally aware

## EXAMPLE GREETINGS
- English: "Hi! Thanks for calling ${agent.agency_name}. How can I help you today?"
- If caller speaks Spanish: "¡Hola! Gracias por llamar a ${agent.agency_name}. ¿En qué le puedo ayudar?"
- Spanglish: "Hey, thanks for calling! ¿Cómo te puedo help today?"
`.trim();

    return new Response(JSON.stringify({
      assistant: {
        name: `${agent.agency_name} Assistant`,
        firstMessage: `Hello ${leadName}, thanks for calling ${agent.agency_name}. How can I help you?`,
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [{ role: "system", content: systemPrompt }]
        }
      }
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});