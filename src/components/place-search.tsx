"use client";

import { useEffect, useState } from "react";
import { BedDouble, Car, MapPin, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Button, Input } from "./ui";
import type { PlaceResult } from "@/app/api/places/search/route";

export type PlaceAddType = "activity" | "town" | "meal" | "stay" | "transfer";

export function PlaceSearch({
  near,
  tripStart,
  tripEnd,
  canEdit,
  onPreview,
  onAdd,
  onAddStay,
}: {
  near?: string;
  tripStart: string;
  tripEnd: string;
  canEdit: boolean;
  onPreview: (place: PlaceResult) => void;
  onAdd: (place: PlaceResult, dayDate: string, type: "ACTIVITY" | "MEAL" | "TRANSFER") => Promise<void>;
  onAddStay: (place: PlaceResult, checkInDate: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(tripStart.slice(0, 10));
  const [addType, setAddType] = useState<PlaceAddType>("activity");
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (near) params.set("near", near);
        const res = await fetch(`/api/places/search?${params}`);
        const data = await res.json();
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, near]);

  async function handleAdd(place: PlaceResult) {
    setAddingId(place.id);
    try {
      if (addType === "stay") {
        await onAddStay(place, selectedDay);
      } else {
        const type =
          addType === "meal" ? "MEAL" : addType === "transfer" ? "TRANSFER" : "ACTIVITY";
        await onAdd(place, selectedDay, type);
      }
      setQuery("");
      setResults([]);
    } finally {
      setAddingId(null);
    }
  }

  const dateLabel = addType === "stay" ? "Check-in date (optional)" : "Add to day";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-800">Search places</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Find sights, restaurants, hotels, and neighborhoods — add to your plan or as a stay.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={near ? `Hotels, restaurants, sights in ${near}…` : "Search destinations, hotels, restaurants…"}
          className="flex-1"
        />
        {canEdit && (
          <>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={addType}
              onChange={(e) => setAddType(e.target.value as PlaceAddType)}
              title="What to add"
            >
              <option value="activity">Add as activity</option>
              <option value="town">Add as town stop</option>
              <option value="transfer">Add as drive / transfer</option>
              <option value="meal">Add as meal</option>
              <option value="stay">Add as stay</option>
            </select>
            <Input
              type="date"
              value={selectedDay}
              min={tripStart.slice(0, 10)}
              max={tripEnd.slice(0, 10)}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full sm:w-40"
              title={dateLabel}
            />
          </>
        )}
      </div>

      {loading && <p className="mt-3 text-xs text-slate-500">Searching…</p>}

      {results.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {results.map((place) => (
            <li
              key={place.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{place.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{place.displayName}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-brand-700">{place.category}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => onPreview(place)}>
                  <MapPin className="mr-1 h-3.5 w-3.5" />
                  Map
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={() => handleAdd(place)} disabled={addingId === place.id}>
                    {addType === "stay" ? (
                      <BedDouble className="mr-1 h-3.5 w-3.5" />
                    ) : addType === "meal" ? (
                      <UtensilsCrossed className="mr-1 h-3.5 w-3.5" />
                    ) : addType === "transfer" ? (
                      <Car className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Plus className="mr-1 h-3.5 w-3.5" />
                    )}
                    {addingId === place.id
                      ? "…"
                      : addType === "stay"
                        ? "Add stay"
                        : addType === "transfer"
                          ? "Add transfer"
                          : addType === "town"
                            ? "Add stop"
                            : "Add"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">No results — try a more specific name or include the city.</p>
      )}
    </div>
  );
}
