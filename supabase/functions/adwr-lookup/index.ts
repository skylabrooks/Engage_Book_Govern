// ADWR Point-in-Polygon Lookup
// Uses lat/lng to query real ADWR ArcGIS REST API layers for AMA, AWS zones

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

interface ADWRLookupPayload {
  lat: number;
  lng: number;
}

interface ADWRZoneResult {
  in_ama: boolean;
  ama_name?: string;
  has_aws: boolean;
  water_source: "municipal" | "private_well" | "shared_well" | "hauled" | "unknown";
  zone_risk_level: "low" | "medium" | "high";
  zone_name?: string;
  note?: string;
  source_layer?: string;
  confidence?: number;
}

// ADWR ArcGIS REST API endpoints
// These are public ArcGIS Online layers from Arizona Department of Water Resources
const ARCGIS_ENDPOINTS = {
  // Active Management Areas (AMAs)
  AMA: "https://gisdata.azwater.gov/arcgis/rest/services/Boundaries/AMA_Boundaries/MapServer/0",
  
  // Irrigation Non-Expansion Areas (INAs)
  INA: "https://gisdata.azwater.gov/arcgis/rest/services/Boundaries/INA_Boundaries/MapServer/0",
  
  // Known wildcat zones (unincorporated with water challenges)
  // These may be custom layers or derived from county assessor data
  WILDCAT: "https://gisdata.azwater.gov/arcgis/rest/services/Reference/UnincorporatedAreas/MapServer/0",
};

/**
 * Query ArcGIS REST API for point-in-polygon check
 */
async function queryArcGISLayer(
  layerUrl: string,
  lat: number,
  lng: number
): Promise<{ found: boolean; attributes: Record<string, unknown>; confidence: number }> {
  // Convert lat/lng to ESRI JSON geometry
  // ADWR layers typically use WGS84 (WKID 4326)
  const geometry = {
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  };

  // Build query parameters for identify/query
  const params = new URLSearchParams({
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryPoint",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });

  const queryUrl = `${layerUrl}/query?${params.toString()}`;

  const response = await fetch(queryUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    console.error(`ArcGIS query failed for ${layerUrl}:`, response.statusText);
    return { found: false, attributes: {}, confidence: 0 };
  }

  const result = await response.json();
  
  if (result.features && result.features.length > 0) {
    // Return first matching feature
    return {
      found: true,
      attributes: result.features[0].attributes ?? {},
      confidence: 0.95, // High confidence from authoritative source
    };
  }

  return { found: false, attributes: {}, confidence: 0 };
}

/**
 * Main lookup function using real ADWR ArcGIS layers
 */
async function lookupADWRZone(lat: number, lng: number): Promise<ADWRZoneResult> {
  // Query AMA boundaries first (most authoritative)
  const amaResult = await queryArcGISLayer(ARCGIS_ENDPOINTS.AMA, lat, lng);
  
  if (amaResult.found) {
    const amaName = (amaResult.attributes.AMA_NAME ?? amaResult.attributes.NAME ?? "Unknown AMA") as string;
    
    // Phoenix AMA typically has good AWS coverage
    if (amaName.toLowerCase().includes("phoenix")) {
      return {
        in_ama: true,
        ama_name: amaName,
        has_aws: true,
        water_source: "municipal",
        zone_risk_level: "low",
        zone_name: amaName,
        note: `Property in regulated ${amaName} with assured water supply.`,
        source_layer: "ADWR AMA Boundaries",
        confidence: amaResult.confidence,
      };
    }
    
    // Tucson AMA also has good AWS coverage
    if (amaName.toLowerCase().includes("tucson")) {
      return {
        in_ama: true,
        ama_name: amaName,
        has_aws: true,
        water_source: "municipal",
        zone_risk_level: "low",
        zone_name: amaName,
        note: `Property in regulated ${amaName} with assured water supply.`,
        source_layer: "ADWR AMA Boundaries",
        confidence: amaResult.confidence,
      };
    }
    
    // Pinal AMA has groundwater depletion concerns
    if (amaName.toLowerCase().includes("pinal")) {
      return {
        in_ama: true,
        ama_name: amaName,
        has_aws: false,
        water_source: "private_well",
        zone_risk_level: "medium",
        zone_name: amaName,
        note: `Property in ${amaName}. Groundwater depletion risk. Recommend well depth/quality verification.`,
        source_layer: "ADWR AMA Boundaries",
        confidence: amaResult.confidence,
      };
    }
    
    // Other AMAs (Prescott, Santa Cruz)
    return {
      in_ama: true,
      ama_name: amaName,
      has_aws: false,
      water_source: "private_well",
      zone_risk_level: "medium",
      zone_name: amaName,
      note: `Property in ${amaName}. Recommend water supply verification.`,
      source_layer: "ADWR AMA Boundaries",
      confidence: amaResult.confidence,
    };
  }
  
  // Check INA boundaries
  const inaResult = await queryArcGISLayer(ARCGIS_ENDPOINTS.INA, lat, lng);
  
  if (inaResult.found) {
    const inaName = (inaResult.attributes.INA_NAME ?? inaResult.attributes.NAME ?? "Unknown INA") as string;
    return {
      in_ama: false,
      has_aws: false,
      water_source: "private_well",
      zone_risk_level: "medium",
      zone_name: inaName,
      note: `Property in ${inaName}. Irrigation restrictions apply. Verify groundwater availability.`,
      source_layer: "ADWR INA Boundaries",
      confidence: inaResult.confidence,
    };
  }
  
  // Check wildcat/unincorporated zones (higher risk)
  const wildcatResult = await queryArcGISLayer(ARCGIS_ENDPOINTS.WILDCAT, lat, lng);
  
  if (wildcatResult.found) {
    const zoneName = (wildcatResult.attributes.NAME ?? wildcatResult.attributes.AREA_NAME ?? "Unincorporated Area") as string;
    
    // Known high-risk zones
    const highRiskZones = ["rio verde", "new river", "anthem", "prescott valley"];
    const isHighRisk = highRiskZones.some((zone) => zoneName.toLowerCase().includes(zone));
    
    if (isHighRisk) {
      return {
        in_ama: false,
        has_aws: false,
        water_source: "hauled",
        zone_risk_level: "high",
        zone_name: zoneName,
        note: `Property in ${zoneName} unincorporated area with potential hauled water. Recommend water supply verification.`,
        source_layer: "ADWR Unincorporated Areas",
        confidence: wildcatResult.confidence,
      };
    }
    
    return {
      in_ama: false,
      has_aws: false,
      water_source: "private_well",
      zone_risk_level: "medium",
      zone_name: zoneName,
      note: `Property in ${zoneName} unincorporated area. Verify water source and quality.`,
      source_layer: "ADWR Unincorporated Areas",
      confidence: wildcatResult.confidence,
    };
  }
  
  // No match in any layer - unknown zone
  return {
    in_ama: false,
    has_aws: false,
    water_source: "unknown",
    zone_risk_level: "medium",
    zone_name: "Unknown",
    note: "Unable to determine water zone from ADWR layers. Recommend manual verification with local water authority.",
    source_layer: "None",
    confidence: 0,
  };
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = (await req.json()) as ADWRLookupPayload;
    const { lat, lng } = payload;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return json({ error: "lat and lng required as numbers" }, 400);
    }

    const result = await lookupADWRZone(lat, lng);
    
    // Track usage (requires agent_id in payload for billing)
    const agent_id = (payload as { lat: number; lng: number; agent_id?: string }).agent_id;
    if (agent_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && serviceRole) {
        const supabase = createClient(supabaseUrl, serviceRole);
        await supabase.from("agent_usage_metrics").insert({
          agent_id,
          metric_type: "water_lookup",
          metric_value: 1,
          cost_usd: 0, // Free ArcGIS API
          metadata: { lat, lng, zone: result.zone_name },
        });
      }
    }
    
    return json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    console.error("adwr-lookup error:", err);
    return json({ error: msg }, 500);
  }
});

/* To invoke locally:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/adwr-lookup' \
    --header 'Content-Type: application/json' \
    --data '{"lat": 33.91, "lng": -111.52}'

*/
