import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  CalendarDays,
  Car,
  MapPin,
  Plane,
  UtensilsCrossed,
} from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar";

export function getEventIcon(event: CalendarEvent): LucideIcon {
  if (event.type === "flight") return Plane;
  if (event.type === "accommodation") return BedDouble;
  if (event.type === "transfer") return Car;
  if (event.type === "itinerary") {
    if (event.meta === "MEAL") return UtensilsCrossed;
    if (event.meta === "ACTIVITY") return MapPin;
    if (event.meta === "TRANSFER") return Car;
  }
  return CalendarDays;
}

export function getEventIconClass(event: CalendarEvent): string {
  if (event.type === "flight") return "bg-sky-100 text-sky-700";
  if (event.type === "accommodation") return "bg-violet-100 text-violet-700";
  if (event.type === "transfer") return "bg-amber-100 text-amber-700";
  if (event.meta === "MEAL") return "bg-orange-100 text-orange-700";
  return "bg-brand-100 text-brand-700";
}
