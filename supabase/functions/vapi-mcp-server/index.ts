// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

interface RiskPayload {
  action: string;
  agent_id?: string;
  lead?: {
    id?: string;
    phone_number?: string;
    name?: string;
  };
  property?: {
    id?: string;
    address_full?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
  risk?: {
    solar_status?: "owned" | "leased" | "none";
    solar_escalator?: boolean;
    solar_escalator_pct?: number;
    solar_monthly_payment?: number;
    solar_buyout_amount?: number;
    solar_transfer_fee?: number;
    water_source?: "municipal" | "private_well" | "shared_well" | "hauled";
    water_zone?: string;
    hoa_rental_cap?: boolean;
    risk_level?: "low" | "medium" | "high";
    assessment_json?: Record<string, unknown>;
  };
  note?: {
    title?: string;
    body: string;
  };
  name?: string; // for tag ensure
  attachTo?: "lead" | "property";
  lead_id?: string;
  property_id?: string;
  lat?: number;
  lng?: number;
  query?: string; // for hoa.query
  hoa_name?: string; // for hoa.query
  document_url?: string; // for solar.lease.scan
  document_base64?: string; // for solar.lease.scan
  vendor?: string; // for solar.lease.scan
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = (await req.json()) as RiskPayload;
    if (!payload?.action) {
      return json({ error: "Missing action" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Server not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    switch (payload.action) {
      case "risk_assessment.create": {
        const agent_id = payload.agent_id;
        if (!agent_id) return json({ error: "agent_id required" }, 400);

        // Resolve or create lead
        let lead_id = payload.lead?.id ?? null;
        if (!lead_id && payload.lead?.phone_number) {
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("agent_id", agent_id)
            .eq("phone_number", payload.lead.phone_number)
            .single();
          if (existing?.id) {
            lead_id = existing.id;
          } else {
            const { data: inserted, error: insLeadErr } = await supabase
              .from("leads")
              .insert({
                agent_id,
                phone_number: payload.lead.phone_number,
                name: payload.lead.name ?? null,
                interest_level: "warm",
                summary: "Created via risk_assessment.create",
              })
              .select("id")
              .single();
            if (insLeadErr) return json({ error: insLeadErr.message }, 400);
            lead_id = inserted?.id ?? null;
          }
        }

        // Resolve or create property
        let property_id = payload.property?.id ?? null;
        if (!property_id && payload.property?.address_full) {
          const { data: existingProp } = await supabase
            .from("properties")
            .select("id")
            .eq("agent_id", agent_id)
            .eq("address_full", payload.property.address_full)
            .single();
          if (existingProp?.id) {
            property_id = existingProp.id;
          } else {
            const { data: insProp, error: insPropErr } = await supabase
              .from("properties")
              .insert({
                agent_id,
                address_full: payload.property.address_full,
                city: payload.property.city ?? null,
                state: payload.property.state ?? null,
                postal_code: payload.property.postal_code ?? null,
                details_json: { lat: payload.property.lat ?? null, lng: payload.property.lng ?? null },
                status: "active",
              })
              .select("id")
              .single();
            if (insPropErr) return json({ error: insPropErr.message }, 400);
            property_id = insProp?.id ?? null;
          }
        }

        const risk = payload.risk ?? {};
        const { data: insertedRisk, error: riskErr } = await supabase
          .from("risk_assessments")
          .insert({
            agent_id,
            lead_id,
            property_id,
            solar_status: risk.solar_status ?? null,
            solar_escalator: risk.solar_escalator ?? null,
            solar_escalator_pct: risk.solar_escalator_pct ?? null,
            solar_monthly_payment: risk.solar_monthly_payment ?? null,
            solar_buyout_amount: risk.solar_buyout_amount ?? null,
            solar_transfer_fee: risk.solar_transfer_fee ?? null,
            water_source: risk.water_source ?? null,
            water_zone: risk.water_zone ?? null,
            hoa_rental_cap: risk.hoa_rental_cap ?? null,
            risk_level: risk.risk_level ?? null,
            assessment_json: risk.assessment_json ?? {},
          })
          .select("id, created_at")
          .single();
        if (riskErr) return json({ error: riskErr.message }, 400);

        return json({ ok: true, risk_assessment_id: insertedRisk?.id, created_at: insertedRisk?.created_at });
      }

      case "note.create": {
        const agent_id = payload.agent_id;
        if (!agent_id) return json({ error: "agent_id required" }, 400);
        if (!payload.note?.body) return json({ error: "note.body required" }, 400);
        const { data: note, error: noteErr } = await supabase
          .from("notes")
          .insert({
            agent_id,
            lead_id: payload.lead?.id ?? null,
            property_id: payload.property?.id ?? null,
            title: payload.note?.title ?? null,
            body: payload.note.body,
          })
          .select("id, created_at")
          .single();
        if (noteErr) return json({ error: noteErr.message }, 400);
        return json({ ok: true, note_id: note?.id, created_at: note?.created_at });
      }

      case "tags.ensure_and_attach": {
        const agent_id = payload.agent_id;
        const name = payload.name;
        const attachTo = payload.attachTo;
        if (!agent_id || !name || !attachTo) return json({ error: "agent_id, name, attachTo required" }, 400);

        // Ensure tag exists for agent
        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("agent_id", agent_id)
          .eq("name", name)
          .single();
        let tag_id = existingTag?.id ?? null;
        if (!tag_id) {
          const { data: newTag, error: tagErr } = await supabase
            .from("tags")
            .insert({ agent_id, name })
            .select("id")
            .single();
          if (tagErr) return json({ error: tagErr.message }, 400);
          tag_id = newTag?.id ?? null;
        }

        if (attachTo === "lead") {
          if (!payload.lead_id) return json({ error: "lead_id required" }, 400);
          const { error: ltErr } = await supabase
            .from("lead_tags")
            .upsert({ lead_id: payload.lead_id, tag_id }, { onConflict: "lead_id,tag_id" });
          if (ltErr) return json({ error: ltErr.message }, 400);
          return json({ ok: true, tag_id });
        } else {
          if (!payload.property_id) return json({ error: "property_id required" }, 400);
          const { error: ptErr } = await supabase
            .from("property_tags")
            .upsert({ property_id: payload.property_id, tag_id }, { onConflict: "property_id,tag_id" });
          if (ptErr) return json({ error: ptErr.message }, 400);
          return json({ ok: true, tag_id });
        }
      }

      case "risk_assessment.latest": {
        const agent_id = payload.agent_id;
        if (!agent_id) return json({ error: "agent_id required" }, 400);
        const lead_id = payload.lead_id ?? null;
        const property_id = payload.property_id ?? null;
        if (!lead_id && !property_id) return json({ error: "lead_id or property_id required" }, 400);
        const query = supabase
          .from("latest_risk_assessments")
          .select("id, agent_id, lead_id, property_id, risk_level, solar_status, water_source, hoa_rental_cap, created_at")
          .eq("agent_id", agent_id)
          .limit(1);
        if (lead_id) query.eq("lead_id", lead_id);
        if (property_id) query.eq("property_id", property_id);
        const { data, error } = await query.single();
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, latest: data });
      }

      case "water.lookup": {
        const lat = payload.lat;
        const lng = payload.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return json({ error: "lat,lng required" }, 400);

        // Call ADWR lookup function
        const adwrUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/adwr-lookup";
        try {
          const adwrResp = await fetch(adwrUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const adwrData = await adwrResp.json();
          if (!adwrData.ok) {
            return json({ error: adwrData.error ?? "ADWR lookup failed" }, 400);
          }
          return json({
            ok: true,
            water_source: adwrData.water_source,
            water_zone: adwrData.zone_name ?? "Unknown",
            in_ama: adwrData.in_ama,
            has_aws: adwrData.has_aws,
            zone_risk_level: adwrData.zone_risk_level,
            note: adwrData.note,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "ADWR service unavailable";
          console.error("water.lookup error:", msg);
          return json({ error: msg }, 500);
        }
      }

      case "hoa.query": {
        const query = payload.query;
        const hoa_name = payload.hoa_name;
        if (!query || !hoa_name) return json({ error: "query, hoa_name required" }, 400);

        // Call HOA RAG function
        const hoaUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/hoa-rag";
        try {
          const hoaResp = await fetch(hoaUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "hoa.query", hoa_name, query }),
          });
          const hoaData = await hoaResp.json();
          if (!hoaData.ok) {
            return json({ error: hoaData.error ?? "HOA query failed" }, 400);
          }
          return json({ ok: true, hoa_name: hoaData.hoa_name, answer: hoaData.answer });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "HOA service unavailable";
          console.error("hoa.query error:", msg);
          return json({ error: msg }, 500);
        }
      }

      case "solar.lease.scan": {
        const agent_id = payload.agent_id;
        const lead_id = payload.lead_id ?? null;
        const property_id = payload.property_id ?? null;
        const document_url = payload.document_url;
        const document_base64 = payload.document_base64;
        const vendor = payload.vendor;

        if (!agent_id) return json({ error: "agent_id required" }, 400);
        if (!lead_id && !property_id) return json({ error: "lead_id or property_id required" }, 400);
        if (!document_url && !document_base64) return json({ error: "document_url or document_base64 required" }, 400);

        // Call solar OCR scanner function
        const scannerUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/solar-ocr-scanner";
        try {
          const scanResp = await fetch(scannerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "solar.lease.scan",
              agent_id,
              lead_id,
              property_id,
              document_url,
              document_base64,
              vendor,
            }),
          });
          const scanData = await scanResp.json();
          if (!scanData.ok) {
            return json({ error: scanData.error ?? "Solar OCR scan failed" }, 400);
          }
          return json({
            ok: true,
            risk_assessment_id: scanData.risk_assessment_id,
            extracted_data: scanData.extracted_data,
            risk_level: scanData.risk_level,
            assessment_json: scanData.assessment_json,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Solar scanner service unavailable";
          console.error("solar.lease.scan error:", msg);
          return json({ error: msg }, 500);
        }
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("vapi-mcp-server error:", err);
    return json({ error: msg }, 500);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/vapi-mcp-server' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"action":"risk_assessment.create","agent_id":"<agent-uuid>","lead":{"phone_number":"+16025550123","name":"John Doe"},"property":{"address_full":"123 Desert Lane, New River, AZ"},"risk":{"solar_status":"leased","solar_escalator":true,"solar_escalator_pct":2.9,"solar_monthly_payment":180,"water_source":"hauled","risk_level":"high","assessment_json":{"source":"ai"}}}'

*/
