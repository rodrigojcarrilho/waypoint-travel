"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapPoint } from "./trip-map";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({
  points,
  route,
}: {
  points: MapPoint[];
  route?: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    const coords: Array<[number, number]> = [
      ...points.map((p) => [p.latitude, p.longitude] as [number, number]),
      ...(route ?? []),
    ];
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 10);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 8 });
  }, [map, points, route]);

  return null;
}

export function TripMapInner({
  points,
  route,
  center,
}: {
  points: MapPoint[];
  route?: Array<[number, number]>;
  center: { lat: number; lng: number };
}) {
  const zoom = points.length <= 1 && (!route || route.length <= 1) ? 6 : 5;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} route={route} />      {route && route.length > 1 && (
        <Polyline positions={route} pathOptions={{ color: "#0d9488", weight: 3, dashArray: "8 8" }} />
      )}
      {points.map((point) => (
        <Marker key={point.id} position={[point.latitude, point.longitude]} icon={icon}>
          <Popup>
            <strong>{point.title}</strong>
            <br />
            <span className="text-xs capitalize">{point.type}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
