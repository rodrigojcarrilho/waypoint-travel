import type { Flight } from "@prisma/client";
import { airportLabel, lookupAirport } from "./airports";
import { prisma } from "./db";

export async function syncFlightToItinerary(tripId: string, flight: Flight) {
  const arrival = lookupAirport(flight.arrivalAirport);
  const departure = lookupAirport(flight.departureAirport);
  const dayDate = new Date(flight.arrivalTime);
  dayDate.setHours(0, 0, 0, 0);

  const stops: Array<{
    title: string;
    location: string;
    latitude?: number;
    longitude?: number;
    dayDate: Date;
    startTime: string;
    type: "ACTIVITY" | "TRANSFER";
  }> = [
    {
      title: `Arrive in ${arrival ? arrival.city : flight.arrivalAirport}`,
      location: arrival ? `${arrival.city}, ${arrival.country}` : flight.arrivalAirport,
      latitude: arrival?.latitude,
      longitude: arrival?.longitude,
      dayDate,
      startTime: formatTime(flight.arrivalTime),
      type: "ACTIVITY" as const,
    },
  ];

  if (departure) {
    const depDay = new Date(flight.departureTime);
    depDay.setHours(0, 0, 0, 0);
    stops.unshift({
      title: `Depart ${departure.city}`,
      location: `${departure.city}, ${departure.country}`,
      latitude: departure.latitude,
      longitude: departure.longitude,
      dayDate: depDay,
      startTime: formatTime(flight.departureTime),
      type: "TRANSFER" as const,
    });
  }

  const existing = await prisma.itineraryItem.findMany({ where: { tripId } });
  const count = existing.length;

  for (const stop of stops) {
    const duplicate = existing.some(
      (item) =>
        item.title === stop.title &&
        item.dayDate.toISOString().slice(0, 10) === stop.dayDate.toISOString().slice(0, 10)
    );
    if (duplicate) continue;

    await prisma.itineraryItem.create({
      data: {
        tripId,
        title: stop.title,
        description: `Auto-added from flight ${flight.flightNumber} (${airportLabel(flight.departureAirport)} → ${airportLabel(flight.arrivalAirport)})`,
        type: stop.type,
        dayDate: stop.dayDate,
        startTime: stop.startTime,
        location: stop.location,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sortOrder: count,
      },
    });
  }
}

function formatTime(date: Date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function parseDestinations(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // fall through
  }
  return value
    .split(/[,·→]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDestinations(destinations: string[]): string {
  return JSON.stringify(destinations);
}

export function displayDestinations(trip: {
  destination?: string | null;
  destinations?: string | null;
  origin?: string | null;
}): string {
  const list = parseDestinations(trip.destinations);
  if (list.length > 0) return list.join(" · ");
  return trip.destination ?? "";
}

export function displayJourneyLabel(trip: {
  origin?: string | null;
  destination?: string | null;
  destinations?: string | null;
}): string {
  const parts: string[] = [];
  if (trip.origin?.trim()) parts.push(trip.origin.trim());
  const dests = parseDestinations(trip.destinations);
  if (dests.length > 0) parts.push(...dests);
  else if (trip.destination?.trim()) parts.push(trip.destination.trim());
  return parts.join(" → ");
}
