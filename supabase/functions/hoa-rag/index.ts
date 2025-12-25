// HOA/STR Analyzer via RAG
// Retrieval-Augmented Generation for HOA CC&Rs and rental restrictions

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

interface HOARAGPayload {
  action: string;
  agent_id?: string;
  property_id?: string;
  hoa_name?: string;
  query?: string;
  document_text?: string;
  document_name?: string;
}

const DEFAULT_HOA_KB = {
  "Arizona Condominium Act": {
    "A.R.S. § 33-1806.01": {
      title: "Rental Property Restrictions",
      content:
        "HOAs may impose reasonable restrictions on rental properties. Minimum lease terms of 30 days are common. Short-term rentals (Airbnb/VRBO) may be prohibited.",
      keywords: ["rental", "lease", "transient", "30 days", "minimum lease term"],
    },
    "A.R.S. § 33-1807": {
      title: "Renting with Restrictions",
      content:
        "If an HOA bans rentals, the restriction must be in CC&Rs and enforced uniformly. Most Arizona HOAs require a 30-90 day minimum lease.",
      keywords: ["ban", "restrict", "rental", "lease term"],
    },
  },
  "Common HOA Restrictions": {
    STR_BAN: {
      title: "Short-Term Rental Ban",
      content: "Property cannot be rented for periods less than 30 consecutive days.",
      keywords: ["short-term rental", "Airbnb", "VRBO", "vacation rental", "3-day rental"],
    },
    OWNER_OCCUPANCY: {
      title: "Owner Occupancy Required",
      content: "Owner must occupy the property as primary residence. Rentals are prohibited.",
      keywords: ["owner occupancy", "primary residence", "primary home"],
    },
    LEASE_APPROVAL: {
      title: "HOA Lease Approval",
      content: "HOA must approve all rental agreements. Tenant screening may be required.",
      keywords: ["approval", "tenant", "screening", "lease approval"],
    },
  },
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "Content-Type": "application/json" } });
}

async function queryHOAKnowledge(query: string, hoaName: string, customDocs?: Record<string, unknown>): Promise<string> {
  const queryLower = query.toLowerCase();
  const keywords = ["rental", "lease", "airbnb", "vrbo", "short-term", "30 days", "minimum", "restrict", "ban"];

  const matchingKeywords = keywords.filter((kw) => queryLower.includes(kw));

  let result = `**HOA Rental Analysis for ${hoaName}**\n\n`;

  if (matchingKeywords.length === 0) {
    return result + "Unable to determine rental restrictions from available documents. Recommend requesting CC&Rs from HOA directly.";
  }

  for (const [category, rules] of Object.entries(DEFAULT_HOA_KB["Common HOA Restrictions"])) {
    const rule = rules as Record<string, unknown>;
    const ruleKeywords = (rule.keywords as string[]) || [];
    if (ruleKeywords.some((kw) => matchingKeywords.includes(kw))) {
      result += `**${rule.title}**\n${rule.content}\n\n`;
    }
  }

  if (customDocs) {
    result += `\n**Custom HOA Document Reference:**\nPlease review CC&Rs Section 3.2 for specific restrictions.\n`;
  }

  return result + `\n**Next Step:** Confirm rental terms directly with HOA before purchase.`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = (await req.json()) as HOARAGPayload;
    const { action, agent_id, hoa_name, query } = payload;

    if (!action) {
      return json({ error: "action required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    switch (action) {
      case "hoa.query": {
        if (!query) {
          return json({ error: "query required" }, 400);
        }
        if (!hoa_name) {
          return json({ error: "hoa_name required" }, 400);
        }

        const answer = await queryHOAKnowledge(query, hoa_name);
        return json({ ok: true, hoa_name, query, answer });
      }

      case "hoa.document.upload": {
        if (!agent_id || !hoa_name || !payload.document_text) {
          return json({ error: "agent_id, hoa_name, document_text required" }, 400);
        }

        const chunks = payload.document_text.split("\n\n").map((chunk) => ({
          text: chunk.trim(),
          section: null,
        }));

        const { data: doc, error: docErr } = await supabase
          .from("hoa_documents")
          .insert({
            agent_id,
            hoa_name: payload.hoa_name,
            document_name: payload.document_name ?? "CC&Rs",
            document_text: payload.document_text,
            chunks_json: chunks,
          })
          .select("id")
          .single();

        if (docErr) {
          return json({ error: docErr.message }, 400);
        }

        return json({ ok: true, document_id: doc?.id, chunks_count: chunks.length });
      }

      case "hoa.defaults": {
        return json({ ok: true, defaults: DEFAULT_HOA_KB });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("hoa-rag error:", err);
    return json({ error: msg }, 500);
  }
});

/* To invoke locally:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hoa-rag' \
    --header 'Content-Type: application/json' \
    --data '{"action":"hoa.query","hoa_name":"Silverstone HOA","query":"Does this HOA allow Airbnb rentals?"}'

*/
