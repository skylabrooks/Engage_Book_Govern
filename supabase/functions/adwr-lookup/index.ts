// ADWR Point-in-Polygon Lookup
// Uses lat/lng to determine if a property is in an AMA, AWS zone, or Wildcat area

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
}

async function lookupADWRZone(lat: number, lng: number): Promise<ADWRZoneResult> {
  // Determine zone based on lat/lng
  // In production, integrate real ADWR ArcGIS REST layers
  
  const inWildcatZone = isInWildcatZone(lat, lng);
  const inPhoenixAMA = isInPhoenixAMA(lat, lng);
  const inTucsonAMA = isInTucsonAMA(lat, lng);
  const inPinalAMA = isInPinalAMA(lat, lng);

  if (inWildcatZone) {
    return {
      in_ama: false,
      has_aws: false,
      water_source: "hauled",
      zone_risk_level: "high",
      zone_name: getWildcatZoneName(lat, lng),
      note: "Property is in unincorporated zone with potential hauled water. Recommend water supply verification.",
    };
  }

  if (inPhoenixAMA) {
    return {
      in_ama: true,
      ama_name: "Phoenix AMA",
      has_aws: true,
      water_source: "municipal",
      zone_risk_level: "low",
      note: "Property in regulated Phoenix AMA with assured water supply.",
    };
  }

  if (inTucsonAMA) {
    return {
      in_ama: true,
      ama_name: "Tucson AMA",
      has_aws: true,
      water_source: "municipal",
      zone_risk_level: "low",
      note: "Property in regulated Tucson AMA with assured water supply.",
    };
  }

  if (inPinalAMA) {
    return {
      in_ama: true,
      ama_name: "Pinal AMA",
      has_aws: false,
      water_source: "private_well",
      zone_risk_level: "medium",
      note: "Property in Pinal AMA. Groundwater depletion risk. Recommend well depth/quality verification.",
    };
  }

  return {
    in_ama: false,
    has_aws: false,
    water_source: "unknown",
    zone_risk_level: "medium",
    note: "Unable to determine water zone. Recommend manual verification with local water authority.",
  };
}

function isInWildcatZone(lat: number, lng: number): boolean {
  const wildcatZones = [
    { name: "Rio Verde Foothills", minLat: 33.73, maxLat: 33.84, minLng: -111.48, maxLng: -111.35 },
    { name: "New River", minLat: 33.85, maxLat: 33.98, minLng: -111.68, maxLng: -111.38 },
    { name: "Anthem", minLat: 33.68, maxLat: 33.82, minLng: -112.18, maxLng: -111.92 },
    { name: "Prescott Valley", minLat: 34.5, maxLat: 34.65, minLng: -112.5, maxLng: -112.2 },
  ];

  return wildcatZones.some((zone) => lat >= zone.minLat && lat <= zone.maxLat && lng >= zone.minLng && lng <= zone.maxLng);
}

function getWildcatZoneName(lat: number, lng: number): string {
  const wildcatZones = [
    { name: "Rio Verde Foothills", minLat: 33.73, maxLat: 33.84, minLng: -111.48, maxLng: -111.35 },
    { name: "New River", minLat: 33.85, maxLat: 33.98, minLng: -111.68, maxLng: -111.38 },
    { name: "Anthem", minLat: 33.68, maxLat: 33.82, minLng: -112.18, maxLng: -111.92 },
    { name: "Prescott Valley", minLat: 34.5, maxLat: 34.65, minLng: -112.5, maxLng: -112.2 },
  ];

  const zone = wildcatZones.find((z) => lat >= z.minLat && lat <= z.maxLat && lng >= z.minLng && lng <= z.maxLng);
  return zone?.name ?? "Unknown Wildcat Zone";
}

function isInPhoenixAMA(lat: number, lng: number): boolean {
  return lat >= 32.8 && lat <= 33.95 && lng >= -112.6 && lng <= -111.3;
}

function isInTucsonAMA(lat: number, lng: number): boolean {
  return lat >= 31.8 && lat <= 32.4 && lng >= -111.2 && lng <= -110.6;
}

function isInPinalAMA(lat: number, lng: number): boolean {
  return lat >= 32.2 && lat <= 33.2 && lng >= -111.8 && lng <= -111.1;
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
