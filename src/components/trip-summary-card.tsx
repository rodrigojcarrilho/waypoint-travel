"use client";

import { differenceInCalendarDays } from "date-fns";
import { CalendarDays, MapPin, Plane, Users } from "lucide-react";
import type { JourneyStop } from "@/lib/airports";
import type { CalendarEvent } from "@/lib/calendar";
import { getEventIcon, getEventIconClass } from "@/lib/event-icons";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export function TripSummaryCard({
  trip,
  journeyStops,
  calendarEvents,
  memberCount,
  settlements,
}: {
  trip: {
    name: string;
    startDate: string;
    endDate: string;
    origin?: string | null;
    itineraryItems: unknown[];
    flights: unknown[];
    accommodations: unknown[];
  };
  journeyStops: JourneyStop[];
  calendarEvents: CalendarEvent[];
  memberCount: number;
  settlements: Array<{ fromName: string; toName: string; amount: number }>;
}) {
  const days = differenceInCalendarDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const upcoming = calendarEvents.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-brand-800 px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">Your trip</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">{trip.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <CalendarDays className="h-4 w-4" />
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {days} days
            </p>
          </div>
          {journeyStops.length >= 2 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-white/90">
              {journeyStops.map((stop, i) => (
                <span key={stop.id} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-white/50">→</span>}
                  <span className="rounded-full bg-white/15 px-2.5 py-1">{stop.city}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Stat icon={<MapPin className="h-4 w-4" />} label="Stops" value={String(trip.itineraryItems.length)} />
        <Stat icon={<Plane className="h-4 w-4" />} label="Flights" value={String(trip.flights.length)} />
        <Stat icon={<Users className="h-4 w-4" />} label="Travelers" value={String(memberCount)} />
        <Stat
          icon={<CalendarDays className="h-4 w-4" />}
          label="Stays"
          value={String(trip.accommodations.length)}
        />
      </div>

      {(upcoming.length > 0 || settlements.length > 0) && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coming up</p>
                <ul className="mt-2 space-y-2">
                  {upcoming.map((event) => {
                    const Icon = getEventIcon(event);
                    return (
                      <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${getEventIconClass(event)}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate text-slate-800">{event.title}</span>
                        </span>
                        <span className="shrink-0 text-slate-500">{formatDateTime(event.start)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {settlements.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">To settle</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {settlements.slice(0, 2).map((s, i) => (
                    <li key={i}>
                      {s.fromName} → {s.toName}: <strong>{formatCurrency(s.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-brand-700">{icon}</span>
      <div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
