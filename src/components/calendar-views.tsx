"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar";

type ViewMode = "day" | "week" | "month";

function isDayInTrip(day: Date, tripStart: Date, tripEnd: Date) {
  const d = startOfDay(day).getTime();
  return d >= startOfDay(tripStart).getTime() && d <= startOfDay(tripEnd).getTime();
}

export function CalendarViews({
  events,
  tripStart: tripStartStr,
  tripEnd: tripEndStr,
  tripId,
}: {
  events: CalendarEvent[];
  tripStart: string;
  tripEnd: string;
  tripId: string;
}) {
  const [view, setView] = useState<ViewMode>("week");
  const tripStart = useMemo(() => startOfDay(new Date(tripStartStr)), [tripStartStr]);
  const tripEnd = useMemo(() => startOfDay(new Date(tripEndStr)), [tripEndStr]);
  const [cursor, setCursor] = useState(tripStart);

  const tripDays = useMemo(() => eachDayOfInterval({ start: tripStart, end: tripEnd }), [tripStart, tripEnd]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-800">Trip calendar</p>
          <p className="text-xs text-slate-500">Switch views or export to your phone or Google Calendar.</p>
        </div>
        <a href={`/api/trips/${tripId}/export/ics`}>
          <Button variant="secondary" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export .ics
          </Button>
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                view === mode ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-brand-50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {view !== "day" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              onClick={() => setCursor((d) => addDays(d, view === "week" ? -7 : -30))}
            >
              ←
            </button>
            <span className="min-w-36 text-center text-sm font-medium">
              {view === "week"
                ? `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
                : format(cursor, "MMMM yyyy")}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
              onClick={() => setCursor((d) => addDays(d, view === "week" ? 7 : 30))}
            >
              →
            </button>
          </div>
        )}
      </div>

      {view === "day" && <DayView days={tripDays} events={events} />}
      {view === "week" && <WeekView cursor={cursor} tripStart={tripStart} tripEnd={tripEnd} events={events} />}
      {view === "month" && <MonthView cursor={cursor} tripStart={tripStart} tripEnd={tripEnd} events={events} />}
    </div>
  );
}

function DayView({ days, events }: { days: Date[]; events: CalendarEvent[] }) {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const key = day.toISOString().slice(0, 10);
        const dayEvents = events.filter((e) => isSameDay(e.start, day));
        return (
          <Card key={key}>
            <h3 className="font-semibold text-brand-800">{format(day, "EEEE, MMMM d")}</h3>
            {dayEvents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nothing scheduled</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dayEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs capitalize text-slate-500">{event.type}</p>
                    </div>
                    <span className="text-slate-500">{formatDateTime(event.start)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function WeekView({
  cursor,
  tripStart,
  tripEnd,
  events,
}: {
  cursor: Date;
  tripStart: Date;
  tripEnd: Date;
  events: CalendarEvent[];
}) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const inTrip = isDayInTrip(day, tripStart, tripEnd);
        const dayEvents = events.filter((e) => isSameDay(e.start, day));
        const hasEvents = dayEvents.length > 0;
        return (
          <Card
            key={day.toISOString()}
            className={`min-h-40 p-3 ${
              inTrip ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-white opacity-60"
            } ${hasEvents ? "ring-1 ring-brand-300" : ""} ${
              isSameDay(day, new Date()) ? "ring-2 ring-brand-500" : ""
            }`}
          >
            <p className={`text-xs font-semibold ${inTrip ? "text-brand-700" : "text-slate-400"}`}>
              {format(day, "EEE")}
            </p>
            <p className={`text-lg font-bold ${inTrip ? "text-brand-900" : "text-slate-400"}`}>
              {format(day, "d")}
            </p>
            <ul className="mt-2 space-y-1">
              {dayEvents.slice(0, 4).map((event) => (
                <li key={event.id} className="truncate rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-800">
                  {event.title}
                </li>
              ))}
              {dayEvents.length > 4 && <li className="text-[10px] text-slate-500">+{dayEvents.length - 4} more</li>}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function MonthView({
  cursor,
  tripStart,
  tripEnd,
  events,
}: {
  cursor: Date;
  tripStart: Date;
  tripEnd: Date;
  events: CalendarEvent[];
}) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inTrip = isDayInTrip(day, tripStart, tripEnd);
          const inMonth = isSameMonth(day, cursor);
          const dayEvents = events.filter((e) => isSameDay(e.start, day));
          const hasEvents = dayEvents.length > 0;

          let cellClass = "border-transparent bg-slate-50/80 text-slate-400";
          if (inMonth && inTrip) {
            cellClass = hasEvents
              ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200"
              : "border-brand-100 bg-brand-50/60";
          } else if (inMonth) {
            cellClass = "border-slate-200 bg-white";
          }

          return (
            <div
              key={day.toISOString()}
              className={`min-h-20 rounded-lg border p-1.5 text-xs ${cellClass} ${
                isSameDay(day, new Date()) ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <p
                className={`font-semibold ${
                  inMonth && inTrip ? "text-brand-900" : inMonth ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {format(day, "d")}
              </p>
              {dayEvents.slice(0, 2).map((event) => (
                <p
                  key={event.id}
                  className={`mt-0.5 truncate rounded px-1 text-[10px] ${
                    inTrip ? "bg-white/90 font-medium text-brand-900" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {event.title}
                </p>
              ))}
              {dayEvents.length > 2 && <p className="text-[10px] text-slate-500">+{dayEvents.length - 2}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
