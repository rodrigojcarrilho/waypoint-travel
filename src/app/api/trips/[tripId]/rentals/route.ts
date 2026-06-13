import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostCreateSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  company: z.string().min(1),
  pickupLocation: z.string().min(1),
  dropoffLocation: z.string().optional(),
  pickupAt: z.string(),
  returnAt: z.string(),
  bookingRef: z.string().optional(),
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

  const { costAmount, costCurrency, expenseTracking, pickupAt, returnAt, ...rentalData } = parsed.data;

  const rental = await prisma.carRental.create({
    data: {
      tripId,
      ...rentalData,
      pickupAt: new Date(pickupAt),
      returnAt: new Date(returnAt),
      costAmount,
      costCurrency,
    },
  });

  if (costAmount && expenseTracking) {
    await syncBookingExpense(
      tripId,
      "linkedCarRentalId",
      rental.id,
      {
        title: `Car rental: ${rental.company}`,
        expenseDate: rental.pickupAt,
        costAmount: rental.costAmount,
        costCurrency: rental.costCurrency,
      },
      expenseTracking as BookingExpenseInput
    );
  }

  await logActivity(tripId, member.id, "car_rental", rental.id, "created", rental);
  await notifyTripMembers(tripId, "Car rental added", `${rental.company} at ${rental.pickupLocation}`, member.id);

  return NextResponse.json({ rental });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const rentals = await prisma.carRental.findMany({ where: { tripId }, orderBy: { pickupAt: "asc" } });
  return NextResponse.json({ rentals });
}
