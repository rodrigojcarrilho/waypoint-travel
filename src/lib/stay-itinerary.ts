import type { Accommodation, Flight, ItineraryItem, Transfer } from "@prisma/client";
import type { JourneyStop } from "./airports";
import { lookupAirport } from "./airports";
import { extractCityFromAddress, geocodeAddress, samePlace } from "./geocode";
import { prisma } from "./db";

const LINK_PREFIX = "linked-accommodation:";
const TRANSFER_LINK_PREFIX = "linked-transfer:";

type LocatedStay = Accommodation & {
  city: string;
  latitude: number;
  longitude: number;
};

async function resolveStayLocation(stay: Accommodation): Promise<LocatedStay | null> {
  let latitude = stay.latitude ?? undefined;
  let longitude = stay.longitude ?? undefined;
  let city = extractCityFromAddress(stay.address) ?? stay.name;

  if ((!latitude || !longitude) && stay.address) {
    const geo = await geocodeAddress(stay.address);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      city = geo.city;
      await prisma.accommodation.update({
        where: { id: stay.id },
        data: { latitude, longitude },
      });
    }
  }

  if ((!latitude || !longitude) && stay.name) {
    const cityHint = extractCityFromAddress(stay.address);
    const geo = await geocodeAddress(cityHint ? `${stay.name}, ${cityHint}` : stay.name);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      city = geo.city;
      await prisma.accommodation.update({
        where: { id: stay.id },
        data: { latitude, longitude },
      });
    }
  }

  if (!latitude || !longitude) return null;
  return { ...stay, city, latitude, longitude };
}

function hubFromAirport(code: string) {
  const info = lookupAirport(code);
  if (!info) return null;
  return {
    city: info.city,
    country: info.country,
    latitude: info.latitude,
    longitude: info.longitude,
    label: info.city,
  };
}

export async function syncAccommodationToItinerary(
  tripId: string,
  stay: Accommodation,
  flights: Flight[]
) {
  const located = await resolveStayLocation(stay);
  if (!located) return;

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );
  const inbound = sortedFlights[0];
  const outbound = sortedFlights[sortedFlights.length - 1];

  const arrivalHub = inbound ? hubFromAirport(inbound.arrivalAirport) : null;
  const departureHub =
    outbound && outbound.id !== inbound?.id ? hubFromAirport(outbound.departureAirport) : arrivalHub;

  const items: Array<{
    title: string;
    description: string;
    type: "ACTIVITY" | "TRANSFER";
    dayDate: Date;
    startTime?: string;
    location: string;
    latitude: number;
    longitude: number;
  }> = [];

  const checkInDay = new Date(located.checkIn);
  checkInDay.setHours(0, 0, 0, 0);
  const checkOutDay = new Date(located.checkOut);
  checkOutDay.setHours(0, 0, 0, 0);

  const stayPoint = {
    latitude: located.latitude,
    longitude: located.longitude,
    city: located.city,
  };

  if (arrivalHub && !samePlace(arrivalHub, stayPoint)) {
    items.push({
      title: `Travel to ${located.city}`,
      description: `${LINK_PREFIX}${stay.id} · from ${arrivalHub.city}`,
      type: "TRANSFER",
      dayDate: checkInDay,
      startTime: "10:00",
      location: `${arrivalHub.city} → ${located.city}`,
      latitude: located.latitude,
      longitude: located.longitude,
    });
  }

  items.push({
    title: `Check in: ${located.name}`,
    description: `${LINK_PREFIX}${stay.id}`,
    type: "ACTIVITY",
    dayDate: checkInDay,
    startTime: formatTime(located.checkIn),
    location: located.address || located.city,
    latitude: located.latitude,
    longitude: located.longitude,
  });

  items.push({
    title: `Check out: ${located.name}`,
    description: `${LINK_PREFIX}${stay.id}`,
    type: "ACTIVITY",
    dayDate: checkOutDay,
    startTime: formatTime(located.checkOut),
    location: located.address || located.city,
    latitude: located.latitude,
    longitude: located.longitude,
  });

  if (departureHub && !samePlace(departureHub, stayPoint)) {
    const returnDay = new Date(checkOutDay);
    items.push({
      title: `Travel to ${departureHub.city}`,
      description: `${LINK_PREFIX}${stay.id} · for departure`,
      type: "TRANSFER",
      dayDate: returnDay,
      startTime: "11:00",
      location: `${located.city} → ${departureHub.city}`,
      latitude: departureHub.latitude,
      longitude: departureHub.longitude,
    });
  }

  await prisma.itineraryItem.deleteMany({
    where: { tripId, description: { contains: `${LINK_PREFIX}${stay.id}` } },
  });

  const count = await prisma.itineraryItem.count({ where: { tripId } });
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await prisma.itineraryItem.create({
      data: {
        tripId,
        title: item.title,
        description: item.description,
        type: item.type,
        dayDate: item.dayDate,
        startTime: item.startTime,
        location: item.location,
        latitude: item.latitude,
        longitude: item.longitude,
        sortOrder: count + i,
      },
    });
  }
}

export async function syncAllStaysToItinerary(tripId: string) {
  const [stays, flights] = await Promise.all([
    prisma.accommodation.findMany({ where: { tripId }, orderBy: { checkIn: "asc" } }),
    prisma.flight.findMany({ where: { tripId }, orderBy: { departureTime: "asc" } }),
  ]);

  for (const stay of stays) {
    await syncAccommodationToItinerary(tripId, stay, flights);
  }
}

export async function syncTransferToItinerary(tripId: string, transfer: Transfer) {
  const geo = await geocodeAddress(transfer.toLocation);
  const dayDate = new Date(transfer.datetime);
  dayDate.setHours(0, 0, 0, 0);

  await prisma.itineraryItem.deleteMany({
    where: { tripId, description: { contains: `${TRANSFER_LINK_PREFIX}${transfer.id}` } },
  });

  const count = await prisma.itineraryItem.count({ where: { tripId } });
  await prisma.itineraryItem.create({
    data: {
      tripId,
      title: transfer.title,
      description: `${TRANSFER_LINK_PREFIX}${transfer.id}`,
      type: "TRANSFER",
      dayDate,
      startTime: formatTime(transfer.datetime),
      location: `${transfer.fromLocation} → ${transfer.toLocation}`,
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      sortOrder: count,
    },
  });
}

export async function syncAllTransfersToItinerary(tripId: string) {
  const transfers = await prisma.transfer.findMany({ where: { tripId }, orderBy: { datetime: "asc" } });
  for (const transfer of transfers) {
    await syncTransferToItinerary(tripId, transfer);
  }
}

export async function syncAllRouteToItinerary(tripId: string) {
  await syncAllStaysToItinerary(tripId);
  await syncAllTransfersToItinerary(tripId);
}

function skipItineraryItem(item: ItineraryItem) {
  if (item.type === "MEAL") return true;
  if (item.description?.includes(LINK_PREFIX) && item.type !== "TRANSFER") return true;
  return false;
}

type BuildInput = {
  flights: Flight[];
  accommodations: Accommodation[];
  transfers: Transfer[];
  itineraryItems?: ItineraryItem[];
  origin?: string | null;
};

function addStop(stops: JourneyStop[], stop: JourneyStop) {
  const last = stops[stops.length - 1];
  const key = `${stop.latitude.toFixed(2)},${stop.longitude.toFixed(2)}`;
  if (last && `${last.latitude.toFixed(2)},${last.longitude.toFixed(2)}` === key) return;
  stops.push(stop);
}

export function buildTripJourney({
  flights,
  accommodations,
  itineraryItems = [],
  origin,
}: Omit<BuildInput, "transfers">): JourneyStop[] {
  const stops: JourneyStop[] = [];
  const add = (stop: JourneyStop) => addStop(stops, stop);

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );

  type TimedStop = { time: number; stop: JourneyStop };
  const timed: TimedStop[] = [];

  if (origin?.trim() && sortedFlights[0]) {
    const dep = lookupAirport(sortedFlights[0].departureAirport);
    if (dep) {
      timed.push({
        time: new Date(sortedFlights[0].departureTime).getTime(),
        stop: {
          id: "origin",
          label: origin,
          city: dep.city,
          country: dep.country,
          latitude: dep.latitude,
          longitude: dep.longitude,
          source: "origin",
        },
      });
    }
  }

  for (const flight of sortedFlights) {
    const dep = lookupAirport(flight.departureAirport);
    const arr = lookupAirport(flight.arrivalAirport);
    if (dep) {
      timed.push({
        time: new Date(flight.departureTime).getTime(),
        stop: {
          id: `dep-${flight.id}`,
          label: dep.city,
          city: dep.city,
          country: dep.country,
          latitude: dep.latitude,
          longitude: dep.longitude,
          source: "flight",
        },
      });
    }
    if (arr) {
      timed.push({
        time: new Date(flight.arrivalTime).getTime(),
        stop: {
          id: `arr-${flight.id}`,
          label: arr.city,
          city: arr.city,
          country: arr.country,
          latitude: arr.latitude,
          longitude: arr.longitude,
          source: "flight",
        },
      });
    }
  }

  for (const stay of accommodations) {
    if (!stay.latitude || !stay.longitude) continue;
    const city = extractCityFromAddress(stay.address) ?? stay.name;
    timed.push({
      time: new Date(stay.checkIn).getTime(),
      stop: {
        id: `stay-${stay.id}`,
        label: stay.name,
        city,
        country: "",
        latitude: stay.latitude,
        longitude: stay.longitude,
        source: "itinerary",
      },
    });
  }

  for (const item of itineraryItems) {
    if (!item.latitude || !item.longitude) continue;
    if (skipItineraryItem(item)) continue;
    timed.push({
      time: itemTime(item),
      stop: {
        id: `item-${item.id}`,
        label: item.title,
        city: extractCityFromAddress(item.location) ?? item.title,
        country: "",
        latitude: item.latitude,
        longitude: item.longitude,
        source: "itinerary",
      },
    });
  }

  timed.sort((a, b) => a.time - b.time);
  for (const { stop } of timed) add(stop);

  return stops;
}

function itemTime(item: ItineraryItem) {
  const day = new Date(item.dayDate);
  if (item.startTime) {
    const [h, m] = item.startTime.split(":").map(Number);
    day.setHours(h || 0, m || 0, 0, 0);
  }
  return day.getTime();
}

export function buildChronologicalRouteCoords(
  flights: Flight[],
  accommodations: Accommodation[],
  itineraryItems: ItineraryItem[] = []
): Array<[number, number]> {
  const points: Array<{ time: number; lat: number; lng: number }> = [];

  const sortedFlights = [...flights].sort(
    (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );

  if (sortedFlights[0]) {
    const dep = lookupAirport(sortedFlights[0].departureAirport);
    if (dep) {
      points.push({
        time: new Date(sortedFlights[0].departureTime).getTime(),
        lat: dep.latitude,
        lng: dep.longitude,
      });
    }
    const arr = lookupAirport(sortedFlights[0].arrivalAirport);
    if (arr) {
      points.push({
        time: new Date(sortedFlights[0].arrivalTime).getTime(),
        lat: arr.latitude,
        lng: arr.longitude,
      });
    }
  }

  for (const stay of [...accommodations].sort(
    (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
  )) {
    if (stay.latitude && stay.longitude) {
      points.push({
        time: new Date(stay.checkIn).getTime(),
        lat: stay.latitude,
        lng: stay.longitude,
      });
    }
  }

  for (const item of itineraryItems) {
    if (!item.latitude || !item.longitude) continue;
    if (skipItineraryItem(item)) continue;
    points.push({
      time: itemTime(item),
      lat: item.latitude,
      lng: item.longitude,
    });
  }

  if (sortedFlights.length > 1) {
    const outbound = sortedFlights[sortedFlights.length - 1];
    const dep = lookupAirport(outbound.departureAirport);
    if (dep) {
      points.push({
        time: new Date(outbound.departureTime).getTime(),
        lat: dep.latitude,
        lng: dep.longitude,
      });
    }
    const arr = lookupAirport(outbound.arrivalAirport);
    if (arr) {
      points.push({
        time: new Date(outbound.arrivalTime).getTime(),
        lat: arr.latitude,
        lng: arr.longitude,
      });
    }
  }

  points.sort((a, b) => a.time - b.time);

  const route: Array<[number, number]> = [];
  for (const p of points) {
    const last = route[route.length - 1];
    if (last && last[0] === p.lat && last[1] === p.lng) continue;
    route.push([p.lat, p.lng]);
  }
  return route;
}

function formatTime(date: Date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
