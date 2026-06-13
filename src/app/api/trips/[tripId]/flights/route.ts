import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { syncFlightToItinerary } from "@/lib/flight-itinerary";
import { syncAllRouteToItinerary } from "@/lib/stay-itinerary";
import { syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostCreateSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  airline: z.string().optional(),
  flightNumber: z.string().min(1),
  departureAirport: z.string().min(3),
  arrivalAirport: z.string().min(3),
  departureTime: z.string(),
  arrivalTime: z.string(),
  status: z.enum(["SCHEDULED", "DELAYED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED", "UNKNOWN"]).optional(),
  confirmationCode: z.string().optional(),
  seatInfo: z.string().optional(),
  notes: z.string().optional(),
  ...bookingCostCreateSchema,
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { costAmount, costCurrency, expenseTracking, departureTime, arrivalTime, ...flightData } = parsed.data;

  const flight = await prisma.flight.create({
    data: {
      tripId,
      ...flightData,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(arrivalTime),
      costAmount,
      costCurrency,
    },
  });

  if (costAmount && expenseTracking) {
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
      expenseTracking as BookingExpenseInput
    );
  }

  await logActivity(tripId, member.id, "flight", flight.id, "created", flight);
  await notifyTripMembers(tripId, "Flight added", `Added flight ${flight.flightNumber}`, member.id);
  await syncFlightToItinerary(tripId, flight);
  await syncAllRouteToItinerary(tripId);

  return NextResponse.json({ flight });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const flights = await prisma.flight.findMany({ where: { tripId }, orderBy: { departureTime: "asc" } });
  return NextResponse.json({ flights });
}
