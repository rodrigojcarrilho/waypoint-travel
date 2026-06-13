import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity } from "@/lib/trip-service";
import { syncFlightToItinerary } from "@/lib/flight-itinerary";
import { syncAllRouteToItinerary } from "@/lib/stay-itinerary";
import { deleteLinkedBookingExpense, syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  airline: z.string().optional(),
  flightNumber: z.string().min(1).optional(),
  departureAirport: z.string().min(3).optional(),
  arrivalAirport: z.string().min(3).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  status: z.enum(["SCHEDULED", "DELAYED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED", "UNKNOWN"]).optional(),
  confirmationCode: z.string().optional(),
  seatInfo: z.string().optional(),
  notes: z.string().optional(),
  ...bookingCostSchema,
});

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string; flightId: string }> }) {
  const { tripId, flightId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const existing = await prisma.flight.findFirst({ where: { id: flightId, tripId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { costAmount, costCurrency, expenseTracking, departureTime, arrivalTime, ...flightData } = parsed.data;

  const flight = await prisma.flight.update({
    where: { id: flightId },
    data: {
      ...flightData,
      departureTime: departureTime ? new Date(departureTime) : undefined,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      costAmount: costAmount === null ? null : costAmount,
      costCurrency,
    },
  });

  if (parsed.data.expenseTracking !== undefined || parsed.data.costAmount !== undefined) {
    await syncBookingExpense(
      tripId,
      "linkedFlightId",
      flight.id,
      {
        title: `Flight: ${flight.flightNumber}`,
        expenseDate: flight.departureTime,
        costAmount: flight.costAmount,
        costCurrency: flight.costCurrency,
      },
      expenseTracking as BookingExpenseInput | null | undefined
    );
  }

  await logActivity(tripId, member.id, "flight", flight.id, "updated", { before: existing, after: flight });
  await syncFlightToItinerary(tripId, flight);
  await syncAllRouteToItinerary(tripId);

  return NextResponse.json({ flight });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tripId: string; flightId: string }> }) {
  const { tripId, flightId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await deleteLinkedBookingExpense("linkedFlightId", flightId);
  await prisma.flight.delete({ where: { id: flightId } });
  await syncAllRouteToItinerary(tripId);

  return NextResponse.json({ ok: true });
}
