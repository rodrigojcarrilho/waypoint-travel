import { NextResponse } from "next/server";

export type PlaceResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  category: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const near = searchParams.get("near")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const query = near ? `${q}, ${near}` : q;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "WaypointTravel/1.0 (trip planner; contact@waypoint.local)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ places: [], error: "Search unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as Array<{
      place_id: number;
      name?: string;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
    }>;

    const places: PlaceResult[] = data.map((item) => ({
      id: String(item.place_id),
      name: item.name || item.display_name.split(",")[0],
      displayName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      category: item.type || item.class || "place",
    }));

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [], error: "Search failed" }, { status: 500 });
  }
}
