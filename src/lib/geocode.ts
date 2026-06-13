async function nominatimSearch(
  query: string
): Promise<{ latitude: number; longitude: number; displayName: string; city: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "WaypointTravel/1.0 (trip planner; contact@waypoint.local)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }>;
  const hit = data[0];
  if (!hit) return null;

  const city =
    hit.address?.city ||
    hit.address?.town ||
    hit.address?.village ||
    hit.address?.municipality ||
    hit.display_name.split(",")[0];

  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    displayName: hit.display_name,
    city,
  };
}

function geocodeFallbackQueries(query: string): string[] {
  const trimmed = query.trim();
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  const fallbacks: string[] = [];

  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const cityFromPostal = parts[parts.length - 2].replace(/^[\d\s-]+\s*/, "").trim();
    if (cityFromPostal && cityFromPostal !== trimmed) {
      fallbacks.push(`${cityFromPostal}, ${country}`);
    }
    if (parts.length >= 3) {
      const street = parts[0];
      if (street && cityFromPostal) {
        fallbacks.push(`${street} ${cityFromPostal} ${country}`);
      }
    }
  }

  return [...new Set(fallbacks)];
}

export async function geocodeAddress(
  query: string
): Promise<{ latitude: number; longitude: number; displayName: string; city: string } | null> {
  if (!query.trim()) return null;

  const direct = await nominatimSearch(query);
  if (direct) return direct;

  for (const fallback of geocodeFallbackQueries(query)) {
    await new Promise((r) => setTimeout(r, 1100));
    const hit = await nominatimSearch(fallback);
    if (hit) return hit;
  }

  return null;
}
export function extractCityFromAddress(address?: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    if (candidate) {
      const withoutPostal = candidate.replace(/^[\d\s-]+\s*/, "").trim();
      if (withoutPostal) return withoutPostal;
      if (!/^\d/.test(candidate)) return candidate;
    }
  }
  return parts[0] || null;
}

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const CITY_ALIASES: Record<string, string> = {
  lisboa: "lisbon",
  lisbon: "lisbon",
  münchen: "munich",
  munich: "munich",
  roma: "rome",
  rome: "rome",
  milano: "milan",
  milan: "milan",
  firenze: "florence",
  florence: "florence",
  napoli: "naples",
  naples: "naples",
  köln: "cologne",
  cologne: "cologne",
  wien: "vienna",
  vienna: "vienna",
  praha: "prague",
  prague: "prague",
  warszawa: "warsaw",
  warsaw: "warsaw",
  københavn: "copenhagen",
  copenhagen: "copenhagen",
  göteborg: "gothenburg",
  gothenburg: "gothenburg",
};

export function normalizeCityKey(name: string): string {
  return CITY_ALIASES[name.trim().toLowerCase()] ?? name.trim().toLowerCase();
}

export function samePlace(
  a: { latitude: number; longitude: number; city?: string | null },
  b: { latitude: number; longitude: number; city?: string | null },
  maxKm = 25
): boolean {
  if (distanceKm(a, b) <= maxKm) return true;
  if (a.city && b.city && normalizeCityKey(a.city) === normalizeCityKey(b.city)) return true;
  return false;
}
