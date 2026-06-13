import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { geocodeAddress } from "@/lib/geocode";
import { parseCheckInDateTime, parseCheckOutDateTime } from "@/lib/stay-dates";
import { syncAccommodationToItinerary } from "@/lib/stay-itinerary";
import { syncStayExpense, type StayExpenseInput } from "@/lib/stay-expense";
import { bookingCostCreateSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  bookingRef: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  url: z.string().optional(),
  ...bookingCostCreateSchema,
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const defaultCheckIn = new Date(trip.startDate);
  defaultCheckIn.setHours(12, 0, 0, 0);
  const defaultCheckOut = new Date(trip.endDate);
  defaultCheckOut.setHours(12, 0, 0, 0);

  const checkIn = parseCheckInDateTime(parsed.data.checkIn, parsed.data.checkInTime, defaultCheckIn);
  let checkOut = parseCheckOutDateTime(parsed.data.checkOut, parsed.data.checkOutTime, defaultCheckOut);
  if (checkOut <= checkIn) {
    checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
    if (!parsed.data.checkOutTime?.trim()) checkOut.setHours(12, 0, 0, 0);
  }

  let latitude = parsed.data.latitude;
  let longitude = parsed.data.longitude;
  if ((!latitude || !longitude) && parsed.data.address) {
    const geo = await geocodeAddress(parsed.data.address);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  const accommodation = await prisma.accommodation.create({
    data: {
      tripId,
      name: parsed.data.name,
      address: parsed.data.address,
      bookingRef: parsed.data.bookingRef,
      latitude,
      longitude,
      notes: parsed.data.notes,
      url: parsed.data.url,
      checkIn,
      checkOut,
      costAmount: parsed.data.costAmount,
      costCurrency: parsed.data.costCurrency,
    },
  });

  const flights = await prisma.flight.findMany({ where: { tripId }, orderBy: { departureTime: "asc" } });
  await syncAccommodationToItinerary(tripId, accommodation, flights);

  if (parsed.data.costAmount && parsed.data.expenseTracking) {
    await syncStayExpense(tripId, accommodation, parsed.data.expenseTracking as StayExpenseInput);
  }

  await logActivity(tripId, member.id, "accommodation", accommodation.id, "created", accommodation);
  await notifyTripMembers(tripId, "Stay added", `Added ${accommodation.name}`, member.id);

  return NextResponse.json({ accommodation });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const accommodations = await prisma.accommodation.findMany({
    where: { tripId },
    orderBy: { checkIn: "asc" },
  });

  return NextResponse.json({ accommodations });
}
