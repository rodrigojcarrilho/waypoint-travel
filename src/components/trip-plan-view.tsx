"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaceResult } from "@/app/api/places/search/route";
import type { JourneyStop } from "@/lib/airports";
import { PlaceSearch } from "@/components/place-search";
import { TripMap, type MapPoint } from "@/components/trip-map";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { displayJourneyLabel, parseDestinations } from "@/lib/flight-itinerary";
import { formatDate } from "@/lib/utils";

const ITEM_TYPES = [
  { value: "ACTIVITY", label: "Activity / town stop" },
  { value: "TRANSFER", label: "Drive / transfer" },
  { value: "MEAL", label: "Meal" },
] as const;

export function TripPlanView({
  tripId,
  trip,
  items,
  mapPoints,
  routeCoords,
  journeyStops,
  canEdit,
  onChange,
}: {
  tripId: string;
  trip: {
    startDate: string;
    endDate: string;
    origin?: string | null;
    destinations?: string | null;
    destination?: string | null;
  };
  items: any[];
  mapPoints: MapPoint[];
  routeCoords: Array<[number, number]>;
  journeyStops: JourneyStop[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [preview, setPreview] = useState<PlaceResult | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [form, setForm] = useState({
    dayDate: trip.startDate.slice(0, 10),
    title: "",
    description: "",
    type: "ACTIVITY" as "ACTIVITY" | "TRANSFER" | "MEAL",
    startTime: "",
    location: "",
  });
  const syncedTripRef = useRef<string | null>(null);

  useEffect(() => {
    if (!canEdit || syncedTripRef.current === tripId) return;
    syncedTripRef.current = tripId;
    fetch(`/api/trips/${tripId}/sync-route`, { method: "POST" })
      .then((res) => (res.ok ? onChange() : undefined))
      .catch(() => undefined);
  }, [tripId, canEdit, onChange]);

  const searchNear = useMemo(() => {
    const dests = parseDestinations(trip.destinations);
    return dests[0] || trip.destination || trip.origin || undefined;
  }, [trip]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of items) {
      const key = item.dayDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const displayPoints = useMemo(() => {
    if (!preview) return mapPoints;
    return [
      ...mapPoints,
      {
        id: `preview-${preview.id}`,
        title: preview.name,
        latitude: preview.latitude,
        longitude: preview.longitude,
        type: "itinerary" as const,
      },
    ];
  }, [mapPoints, preview]);

  const displayRoute = preview
    ? [...routeCoords, [preview.latitude, preview.longitude] as [number, number]]
    : routeCoords;

  async function addFromSearch(place: PlaceResult, dayDate: string, type: "ACTIVITY" | "MEAL" | "TRANSFER") {
    await fetch(`/api/trips/${tripId}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayDate,
        title: type === "TRANSFER" ? `Drive to ${place.name}` : place.name,
        location: place.displayName,
        latitude: place.latitude,
        longitude: place.longitude,
        type,
      }),
    });
    onChange();
  }

  async function addStayFromSearch(place: PlaceResult, checkInDate: string) {
    await fetch(`/api/trips/${tripId}/accommodations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: place.name,
        address: place.displayName,
        latitude: place.latitude,
        longitude: place.longitude,
        checkIn: checkInDate,
      }),
    });
    onChange();
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${tripId}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm((f) => ({ ...f, title: "", description: "", location: "", startTime: "" }));
    onChange();
  }

  return (
    <div className="space-y-4">
      <PlaceSearch
        near={searchNear}
        tripStart={trip.startDate}
        tripEnd={trip.endDate}
        canEdit={canEdit}
        onPreview={setPreview}
        onAdd={addFromSearch}
        onAddStay={addStayFromSearch}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Itinerary</h2>
            {canEdit && (
              <button
                type="button"
                className="text-xs font-medium text-brand-700 hover:underline"
                onClick={() => setShowManualAdd((v) => !v)}
              >
                {showManualAdd ? "Hide manual add" : "Add manually"}
              </button>
            )}
          </div>

          {showManualAdd && canEdit && (
            <Card className="border-dashed">
              <form onSubmit={addManual} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Date</Label>
                  <Input type="date" required value={form.dayDate} onChange={(e) => setForm({ ...form, dayDate: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as "ACTIVITY" | "TRANSFER" | "MEAL" })
                    }
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Title</Label>
                  <Input
                    required
                    placeholder={form.type === "TRANSFER" ? "e.g. Drive to Alvor" : "e.g. Day in Lisbon"}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Town or address — we'll geocode it for the map"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time (optional)</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <Button type="submit" size="sm" className="self-end">
                  Add item
                </Button>
              </form>
            </Card>
          )}

          {grouped.length === 0 ? (
            <Card className="text-center text-sm text-slate-500">
              <p>Search above to discover places, or add flights and stays to auto-build your route.</p>
              {journeyStops.length >= 2 && (
                <p className="mt-2 text-brand-700">{displayJourneyLabel(trip)}</p>
              )}
            </Card>
          ) : (
            grouped.map(([date, dayItems]) => (
              <div key={date} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-slate-900">
                  {formatDate(date, { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <ul className="mt-3 space-y-2">
                  {dayItems.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <Badge>{item.type.toLowerCase()}</Badge>
                        </div>
                        {item.location && <p className="mt-0.5 truncate text-xs text-slate-500">{item.location}</p>}
                        {item.startTime && <p className="mt-0.5 text-xs text-slate-400">{item.startTime}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        {item.latitude && item.longitude && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPreview({
                                id: item.id,
                                name: item.title,
                                displayName: item.location || item.title,
                                latitude: item.latitude,
                                longitude: item.longitude,
                                category: item.type,
                              })
                            }
                          >
                            Map
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await fetch(`/api/trips/${tripId}/itinerary/${item.id}`, { method: "DELETE" });
                              onChange();
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Map</h2>
            {preview && (
              <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setPreview(null)}>
                Clear preview
              </button>
            )}
          </div>
          <TripMap
            points={displayPoints}
            route={displayRoute}
            className="h-[min(70vh,560px)]"
            emptyMessage="Search for places or add flights and stays to see your trip on the map"
          />
          {preview && (
            <p className="mt-2 text-xs text-slate-500">
              Previewing: <strong>{preview.name}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
