import { createEvents } from "ics";
import type { Accommodation, Flight, ItineraryItem, Transfer, Trip } from "@prisma/client";

const STAY_LINK_PREFIX = "linked-accommodation:";

/** Itinerary rows synced from stays/flights — calendar uses stays & flights directly instead. */
export function shouldShowItineraryOnCalendar(item: ItineraryItem): boolean {
  if (item.description?.includes(STAY_LINK_PREFIX)) {
    return item.type === "TRANSFER";
  }
  if (item.description?.includes("Auto-added from flight")) {
    return false;
  }
  return true;
}

type CalendarInput = {  trip: Trip;
  itineraryItems: ItineraryItem[];
  flights: Flight[];
  accommodations: Accommodation[];
  transfers: Transfer[];
};

function combineDateAndTime(date: Date, time?: string | null): Date {
  const result = new Date(date);
  if (!time) return result;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isNaN(hours)) result.setHours(hours, minutes || 0, 0, 0);
  return result;
}

export function buildTripIcs({ trip, itineraryItems, flights, accommodations, transfers }: CalendarInput) {
  const visibleItinerary = itineraryItems.filter(shouldShowItineraryOnCalendar);
  const events = [
    ...visibleItinerary.map((item) => {      const start = combineDateAndTime(item.dayDate, item.startTime);
      const end = item.endTime
        ? combineDateAndTime(item.dayDate, item.endTime)
        : new Date(start.getTime() + 60 * 60 * 1000);

      return {
        title: item.title,
        description: item.description ?? undefined,
        location: item.location ?? undefined,
        start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()] as [
          number,
          number,
          number,
          number,
          number,
        ],
        end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()] as [
          number,
          number,
          number,
          number,
          number,
        ],
      };
    }),
    ...flights.map((flight) => ({
      title: `Flight ${flight.flightNumber}`,
      description: `${flight.departureAirport} → ${flight.arrivalAirport}`,
      start: [
        flight.departureTime.getFullYear(),
        flight.departureTime.getMonth() + 1,
        flight.departureTime.getDate(),
        flight.departureTime.getHours(),
        flight.departureTime.getMinutes(),
      ] as [number, number, number, number, number],
      end: [
        flight.arrivalTime.getFullYear(),
        flight.arrivalTime.getMonth() + 1,
        flight.arrivalTime.getDate(),
        flight.arrivalTime.getHours(),
        flight.arrivalTime.getMinutes(),
      ] as [number, number, number, number, number],
    })),
    ...accommodations.flatMap((stay) => [
      {
        title: `Check in: ${stay.name}`,
        location: stay.address ?? undefined,
        start: [
          stay.checkIn.getFullYear(),
          stay.checkIn.getMonth() + 1,
          stay.checkIn.getDate(),
          stay.checkIn.getHours(),
          stay.checkIn.getMinutes(),
        ] as [number, number, number, number, number],
        duration: { hours: 1 },
      },
      {
        title: `Check out: ${stay.name}`,
        location: stay.address ?? undefined,
        start: [
          stay.checkOut.getFullYear(),
          stay.checkOut.getMonth() + 1,
          stay.checkOut.getDate(),
          stay.checkOut.getHours(),
          stay.checkOut.getMinutes(),
        ] as [number, number, number, number, number],
        duration: { hours: 1 },
      },
    ]),
    ...transfers.map((transfer) => ({
      title: transfer.title,
      description: `${transfer.fromLocation} → ${transfer.toLocation}`,
      start: [
        transfer.datetime.getFullYear(),
        transfer.datetime.getMonth() + 1,
        transfer.datetime.getDate(),
        transfer.datetime.getHours(),
        transfer.datetime.getMinutes(),
      ] as [number, number, number, number, number],
      duration: { hours: 1 },
    })),
  ];

  const { error, value } = createEvents(events);
  if (error || !value) throw new Error(error?.message ?? "Failed to generate calendar");

  return value;
}

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "itinerary" | "flight" | "accommodation" | "transfer";
  meta?: string;
};

export function buildCalendarEvents(input: CalendarInput): CalendarEvent[] {
  const { itineraryItems, flights, accommodations, transfers } = input;
  const visibleItinerary = itineraryItems.filter(shouldShowItineraryOnCalendar);

  return [
    ...visibleItinerary.map((item) => {      const start = combineDateAndTime(item.dayDate, item.startTime);
      const end = item.endTime
        ? combineDateAndTime(item.dayDate, item.endTime)
        : new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: item.id,
        title: item.title,
        start,
        end,
        type: "itinerary" as const,
        meta: item.type,
      };
    }),
    ...flights.map((flight) => ({
      id: flight.id,
      title: `${flight.flightNumber}: ${flight.departureAirport} → ${flight.arrivalAirport}`,
      start: flight.departureTime,
      end: flight.arrivalTime,
      type: "flight" as const,
      meta: flight.status,
    })),
    ...accommodations.flatMap((stay) => [
      {
        id: `${stay.id}-check-in`,
        title: `Check in: ${stay.name}`,
        start: stay.checkIn,
        end: new Date(stay.checkIn.getTime() + 60 * 60 * 1000),
        type: "accommodation" as const,
        meta: stay.address ?? undefined,
      },
      {
        id: `${stay.id}-check-out`,
        title: `Check out: ${stay.name}`,
        start: stay.checkOut,
        end: new Date(stay.checkOut.getTime() + 60 * 60 * 1000),
        type: "accommodation" as const,
        meta: stay.address ?? undefined,
      },
    ]),
    ...transfers.map((transfer) => ({
      id: transfer.id,
      title: transfer.title,
      start: transfer.datetime,
      end: new Date(transfer.datetime.getTime() + 60 * 60 * 1000),
      type: "transfer" as const,
      meta: `${transfer.fromLocation} → ${transfer.toLocation}`,
    })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
}
