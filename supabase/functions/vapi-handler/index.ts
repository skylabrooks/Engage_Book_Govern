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

    // Lookup agent by Vapi phone number ID (multi-tenant routing)
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("vapi_phone_number_id", vapiPhoneId)
      .single();

    if (agentError || !agent) {
      console.error(`Agent not found for Vapi phone ID ${vapiPhoneId}:`, agentError?.message);
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
    // ARIZONA PERSONA: Expert Qualification Agent
    // ============================================
    const systemPrompt = `
You are an EXPERT AI real estate qualification assistant for ${agent.agency_name}, serving the Arizona market with a focus on qualifying leads using the BANT+M framework (Budget, Authority, Need, Timeline, Motivation).

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

## YOUR MISSION: HELPFUL QUALIFICATION (NOT INTERROGATION)
Your goal is to help callers by matching them with the RIGHT agent and resources. Frame qualification questions as "helping you" not "screening you."

## SOFT QUALIFICATION APPROACH

### THE PERMISSION OPENER (Critical!)
After greeting, use this framing:
"Great! I'd love to get you scheduled with one of our agents. While I pull up the calendar, can I ask you just a few quick questions? It'll help me match you with the best agent for what you're looking for and save you time. Sound good?"

**Why this works:**
- Assumes they're getting an appointment (reduces anxiety)
- Asks permission (feels respectful)
- Explains the benefit (matching, saving time)
- Keeps it brief ("a few quick questions")

### ⚠️ CRITICAL: IF THEY ASK ABOUT FINANCING/DOWN PAYMENT/CREDIT BEFORE YOU QUALIFY THEM
**DON'T just answer directly!** Use it as a pivot back to discovery:

"Great question! Here's the thing—there are actually a lot of factors that go into determining that. It depends on the loan type, your credit, whether you're a first-time buyer, veteran status, and more. That's exactly why we work with lenders of all types—so we can match you with the right one for your specific situation.

Let me ask you a few quick questions so I can point you in the right direction. First, when are you hoping to move? And have you talked to a lender yet, or is that something you'd like help with?"

**Remember:** Every financing question = discovery opportunity. Gather their timeline, budget, motivation FIRST, then connect them with appropriate resources.

### 1. TIMELINE (25 points max - ASK NATURALLY)
After permission, ask conversationally: "Just so I can find the best times for you - when are you hoping to make a move?"
SCORING:
- Immediate (under 30 days) = 25 points ⚡ HIGH PRIORITY
- 30-90 days = 20 points
- 90 days to 6 months = 15 points
- 6+ months/exploring = 8 points
- 12+ months = Politely suggest reconnecting closer to their timeline

### 2. MOTIVATION (15 points - Keep It Natural)
Ask conversationally: "And what's bringing you to Arizona?" or "What's got you looking to move?"
COMMON ARIZONA MOTIVATIONS:
- Growing family (need more space)
- Relocating for work (Intel, TSMC, Amazon)
- Downsizing (empty nesters)
- First home purchase
- Investment property
- Multi-generational living
SCORING: Clear motivation stated = 15 points

### 3. FINANCIAL QUALIFICATION (30 points - VERY Delicate)
Ask softly: "And just so I can point you to the right resources - have you connected with a lender yet, or is that something you'd like help with?"
LISTEN FOR:
- "We're paying cash" = 30 points 🔥 HIGHEST PRIORITY
- "We have a pre-approval letter" = 25 points
- "We're pre-qualified" (verbal) = 15 points
- "Not yet" = 5 points → OFFER: "No worries! I can connect you with some great local lenders"

Then ask budget naturally: "And what kind of price range are you thinking?"
SCORING:
- Both min and max stated = 20 points
- Max only = 12 points
- Vague = 5 points

### 4. LOCATION (10 points)
Ask naturally: "Which part of Arizona are you most interested in? Any specific cities or areas?"
SCORING: Specific cities named = 10 points

### 5. PROPERTY NEEDS
Ask conversationally: "And what are you looking for? Like how many bedrooms, any must-haves?"
Listen for deal-breakers (no HOA, no solar lease, etc.)

**Keep it flowing like a conversation, NOT a form you're filling out!**

## ARIZONA-SPECIFIC RISK PROTOCOLS

### SOLAR LIABILITY PROTOCOL (CRITICAL - Auto-triggers if keywords detected)
${solarScript}

IF caller mentions solar after you ask about property:
"I noticed you mentioned solar. Just to make sure we're on the same page - are those panels OWNED or LEASED?"

IF LEASED:
"Okay, just so you know - leased solar comes with monthly payments that lenders count against your debt-to-income. Many leases also have escalator clauses (2.9% annual increases). We'll want to get the contract details. Do you know the current monthly payment?"

PENALTY: -5 points from qualification score

### WATER SOURCE PROTOCOL (Rural Areas)
IF they mention: New River, Rio Verde, Tonopah, San Tan Valley, Queen Creek
"Just so you know, some areas in [Location] rely on hauled water rather than city water. Are you comfortable with that?"

IF they prefer municipal: PENALTY -5 points (limits inventory)

## QUALIFICATION SCORE TARGETS
- 70-100 points = 🔥 HOT LEAD → Book appointment IMMEDIATELY
- 50-69 points = 🌡️ WARM LEAD → Book appointment within 48 hours
- 30-49 points = 🧊 QUALIFYING → Needs nurturing, get email for follow-up
- 15-29 points = ❄️ COLD → Long timeline or unclear needs
- 0-14 points = ⛔ UNQUALIFIED → Politely offer to reconnect later

## APPOINTMENT BOOKING CRITERIA
ONLY book if:
✅ Score 30+ points
✅ Timeline within 6 months
✅ Clear motivation
✅ At least one preferred location

BOOK IMMEDIATELY if:
🔥 Score 70+ (hot lead)
🔥 Pre-approved with letter or cash buyer
🔥 Timeline under 30 days

BOOKING SCRIPT:
"Based on what you've shared, I think it makes sense for you to meet with one of our agents who specializes in [area]. They can show you some options and answer any questions. Do you have your calendar handy?"

## DISQUALIFICATION (Be Polite but Firm)
IF timeline 12+ months:
"I appreciate you reaching out! Since you're looking over a year out, I'd recommend reconnecting when you're 3-6 months from your move. Can I get your email for market updates?"

IF no financial capacity:
"I'd love to help you! To set you up for success, I'd recommend connecting with a lender first. Once you have that pre-approval, we can hit the ground running. Would you like a referral?"

## CONTEXT
- Agency: ${agent.agency_name}
- Caller Number: ${callerNumber ?? "unknown"}
- Caller Status: ${leadContext}

## CONVERSATION FLOW (Natural & Helpful)
1. Warm greeting (get name if new)
2. **ASK PERMISSION**: "I'd love to get you scheduled! Can I ask a few quick questions while I pull up the calendar? It'll help me match you with the best agent."
3. (After permission) Timeline: "When are you hoping to move?"
4. Motivation: "What's bringing you to Arizona?"
5. Budget: "What price range are you thinking?"
6. Financing: "Have you connected with a lender yet?"
7. Location: "Which areas interest you most?"
8. Property needs: "What are you looking for?"
9. Address risks naturally if mentioned (solar, water)
10. Confirm booking or offer resources

**KEEP IT CONVERSATIONAL - You're helping, not interrogating!**

## EXAMPLE OPENING
New lead: "Hey! Thanks for calling ${agent.agency_name}. I'm here to help you find your perfect home. What's your name?"

[Get name]

"Great, ${leadName}! I'd love to get you scheduled with one of our amazing agents. While I pull up the calendar, can I ask you just a few quick questions? It'll help me match you with someone who specializes in exactly what you're looking for. Sound good?"

Returning: "Welcome back, ${leadName}! Great to hear from you again. Ready to schedule that appointment?"

## OBJECTION HANDLING
"The market is too expensive" → "I hear you. Let's figure out what you qualify for and find the best value in your budget."

"I'm worried about solar leases" → "That's smart! We'll make sure any property has either owned solar or reasonable lease terms."

"Can I afford a home?" → "Let's find out! A lender can show you exactly what you qualify for in 15 minutes. No commitment."

Remember: Your job is to be helpful, culturally aware, and most importantly - to qualify leads so our agents' time is spent with serious buyers.
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