export type AirportInfo = {
  code: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

const AIRPORTS: Record<string, AirportInfo> = {
  LHR: { code: "LHR", city: "London", country: "UK", latitude: 51.47, longitude: -0.4543 },
  LGW: { code: "LGW", city: "London", country: "UK", latitude: 51.1537, longitude: -0.1821 },
  STN: { code: "STN", city: "London", country: "UK", latitude: 51.886, longitude: 0.2389 },
  LIS: { code: "LIS", city: "Lisbon", country: "Portugal", latitude: 38.7742, longitude: -9.1342 },
  OPO: { code: "OPO", city: "Porto", country: "Portugal", latitude: 41.2481, longitude: -8.6814 },
  FAO: { code: "FAO", city: "Faro", country: "Portugal", latitude: 37.0144, longitude: -7.9659 },
  CDG: { code: "CDG", city: "Paris", country: "France", latitude: 49.0097, longitude: 2.5479 },
  ORY: { code: "ORY", city: "Paris", country: "France", latitude: 48.7233, longitude: 2.3794 },
  AMS: { code: "AMS", city: "Amsterdam", country: "Netherlands", latitude: 52.3105, longitude: 4.7683 },
  FRA: { code: "FRA", city: "Frankfurt", country: "Germany", latitude: 50.0379, longitude: 8.5622 },
  MAD: { code: "MAD", city: "Madrid", country: "Spain", latitude: 40.4983, longitude: -3.5676 },
  BCN: { code: "BCN", city: "Barcelona", country: "Spain", latitude: 41.2974, longitude: 2.0833 },
  FCO: { code: "FCO", city: "Rome", country: "Italy", latitude: 41.8003, longitude: 12.2389 },
  JFK: { code: "JFK", city: "New York", country: "USA", latitude: 40.6413, longitude: -73.7781 },
  LAX: { code: "LAX", city: "Los Angeles", country: "USA", latitude: 33.9416, longitude: -118.4085 },
  NRT: { code: "NRT", city: "Tokyo", country: "Japan", latitude: 35.772, longitude: 140.3929 },
  HND: { code: "HND", city: "Tokyo", country: "Japan", latitude: 35.5494, longitude: 139.7798 },
  DXB: { code: "DXB", city: "Dubai", country: "UAE", latitude: 25.2532, longitude: 55.3657 },
  SIN: { code: "SIN", city: "Singapore", country: "Singapore", latitude: 1.3644, longitude: 103.9915 },
  SYD: { code: "SYD", city: "Sydney", country: "Australia", latitude: -33.9399, longitude: 151.1753 },
  DUB: { code: "DUB", city: "Dublin", country: "Ireland", latitude: 53.4264, longitude: -6.2499 },
  BER: { code: "BER", city: "Berlin", country: "Germany", latitude: 52.3667, longitude: 13.5033 },
  MUC: { code: "MUC", city: "Munich", country: "Germany", latitude: 48.3538, longitude: 11.7861 },
  ZRH: { code: "ZRH", city: "Zurich", country: "Switzerland", latitude: 47.4647, longitude: 8.5492 },
  VIE: { code: "VIE", city: "Vienna", country: "Austria", latitude: 48.1103, longitude: 16.5697 },
  CPH: { code: "CPH", city: "Copenhagen", country: "Denmark", latitude: 55.618, longitude: 12.656 },
  ARN: { code: "ARN", city: "Stockholm", country: "Sweden", latitude: 59.6519, longitude: 17.9186 },
  OSL: { code: "OSL", city: "Oslo", country: "Norway", latitude: 60.1976, longitude: 11.1004 },
  ATH: { code: "ATH", city: "Athens", country: "Greece", latitude: 37.9364, longitude: 23.9445 },
  IST: { code: "IST", city: "Istanbul", country: "Turkey", latitude: 41.2753, longitude: 28.7519 },
};

export function lookupAirport(code: string): AirportInfo | null {
  const key = code.trim().toUpperCase().slice(0, 3);
  return AIRPORTS[key] ?? null;
}

export function airportLabel(code: string): string {
  const info = lookupAirport(code);
  if (!info) return code.toUpperCase();
  return `${info.city} (${info.code})`;
}

export type JourneyStop = {
  id: string;
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  source: "origin" | "flight" | "destination" | "itinerary";
};

export function buildJourneyFromFlights(
  flights: Array<{ id: string; departureAirport: string; arrivalAirport: string; departureTime: string | Date }>,
  origin?: string | null,
  destinations?: string[] | null
): JourneyStop[] {
  const stops: JourneyStop[] = [];
  const seen = new Set<string>();

  const addStop = (stop: JourneyStop) => {
    const key = `${stop.city}-${stop.country}`;
    if (seen.has(key)) return;
    seen.add(key);
    stops.push(stop);
  };

  if (origin?.trim()) {
    const firstFlight = [...flights].sort(
      (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    )[0];
    const dep = firstFlight ? lookupAirport(firstFlight.departureAirport) : null;
    addStop({
      id: "origin",
      label: origin,
      city: dep?.city ?? origin.split(",")[0].trim(),
      country: dep?.country ?? "",
      latitude: dep?.latitude ?? 51.5,
      longitude: dep?.longitude ?? -0.12,
      source: "origin",
    });
  }

  const sorted = [...flights].sort(
    (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );

  for (const flight of sorted) {
    const dep = lookupAirport(flight.departureAirport);
    const arr = lookupAirport(flight.arrivalAirport);

    if (dep && !origin) {
      addStop({
        id: `dep-${flight.id}`,
        label: airportLabel(flight.departureAirport),
        city: dep.city,
        country: dep.country,
        latitude: dep.latitude,
        longitude: dep.longitude,
        source: "flight",
      });
    }

    if (arr) {
      addStop({
        id: `arr-${flight.id}`,
        label: airportLabel(flight.arrivalAirport),
        city: arr.city,
        country: arr.country,
        latitude: arr.latitude,
        longitude: arr.longitude,
        source: "flight",
      });
    }
  }

  for (const dest of destinations ?? []) {
    if (!dest.trim()) continue;
    addStop({
      id: `dest-${dest}`,
      label: dest,
      city: dest.split(",")[0].trim(),
      country: dest.includes(",") ? dest.split(",").slice(1).join(",").trim() : "",
      latitude: 0,
      longitude: 0,
      source: "destination",
    });
  }

  return stops.filter((s) => s.latitude !== 0 || s.longitude !== 0 || s.source === "destination");
}

export function journeyRouteCoords(stops: JourneyStop[]): Array<[number, number]> {
  return stops.filter((s) => s.latitude && s.longitude).map((s) => [s.latitude, s.longitude]);
}
