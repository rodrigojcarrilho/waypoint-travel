"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export type MapPoint = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type: "itinerary" | "accommodation" | "flight";
};

const MapInner = dynamic(() => import("./trip-map-inner").then((m) => m.TripMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl bg-brand-50 text-sm text-slate-500">
      Loading map...
    </div>
  ),
});

export function TripMap({
  points,
  route,
  emptyMessage = "Add flights, locations to itinerary, or stays to see them on the map",
  className = "h-80",
}: {
  points: MapPoint[];
  route?: Array<[number, number]>;
  emptyMessage?: string;
  className?: string;
}) {
  const center = useMemo(() => {
    if (points.length === 0 && route && route.length > 0) {
      const lat = route.reduce((s, p) => s + p[0], 0) / route.length;
      const lng = route.reduce((s, p) => s + p[1], 0) / route.length;
      return { lat, lng };
    }
    if (points.length === 0) return { lat: 20, lng: 0 };
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    return { lat, lng };
  }, [points, route]);

  const hasContent = points.length > 0 || (route && route.length > 1);

  if (!hasContent) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      <MapInner points={points} route={route} center={center} />
    </div>
  );
}
