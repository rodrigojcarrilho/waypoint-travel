import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";
import { parseCheckInDateTime, parseCheckOutDateTime, toDateInputValue } from "@/lib/stay-dates";
import { syncAccommodationToItinerary } from "@/lib/stay-itinerary";
import { syncStayExpense, type StayExpenseInput } from "@/lib/stay-expense";
import { bookingCostSchema } from "@/lib/booking-expense-api";

const LINK_PREFIX = "linked-accommodation:";

const schema = z.object({
  name: z.string().min(1).optional(),
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
  ...bookingCostSchema,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string; accommodationId: string }> }
) {
  const { tripId, accommodationId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const existing = await prisma.accommodation.findFirst({ where: { id: accommodationId, tripId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let latitude = parsed.data.latitude ?? existing.latitude ?? undefined;
  let longitude = parsed.data.longitude ?? existing.longitude ?? undefined;
  const address = parsed.data.address !== undefined ? parsed.data.address : existing.address;
  if ((!latitude || !longitude) && address) {
    const geo = await geocodeAddress(address);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
  }

  const checkIn =
    parsed.data.checkIn !== undefined || parsed.data.checkInTime !== undefined
      ? parseCheckInDateTime(
          parsed.data.checkIn ?? toDateInputValue(existing.checkIn),
          parsed.data.checkInTime,
          existing.checkIn
        )
      : existing.checkIn;

  let checkOut =
    parsed.data.checkOut !== undefined || parsed.data.checkOutTime !== undefined
      ? parseCheckOutDateTime(
          parsed.data.checkOut ?? toDateInputValue(existing.checkOut),
          parsed.data.checkOutTime,
          existing.checkOut
        )
      : existing.checkOut;

  if (checkOut <= checkIn) {
    checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
  }

  const accommodation = await prisma.accommodation.update({
    where: { id: accommodationId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      bookingRef: parsed.data.bookingRef,
      notes: parsed.data.notes,
      url: parsed.data.url,
      latitude,
      longitude,
      checkIn,
      checkOut,
      costAmount: parsed.data.costAmount === null ? null : parsed.data.costAmount,
      costCurrency: parsed.data.costCurrency,
    },
  });

  const flights = await prisma.flight.findMany({ where: { tripId }, orderBy: { departureTime: "asc" } });
  await syncAccommodationToItinerary(tripId, accommodation, flights);

  if (parsed.data.expenseTracking !== undefined || parsed.data.costAmount !== undefined) {
    await syncStayExpense(tripId, accommodation, parsed.data.expenseTracking as StayExpenseInput | undefined);
  }

  return NextResponse.json({ accommodation });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; accommodationId: string }> }
) {
  const { tripId, accommodationId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await prisma.expense.deleteMany({ where: { linkedAccommodationId: accommodationId } });
  await prisma.itineraryItem.deleteMany({
    where: { tripId, description: { contains: `${LINK_PREFIX}${accommodationId}` } },
  });
  await prisma.accommodation.delete({ where: { id: accommodationId } });
  return NextResponse.json({ ok: true });
}
