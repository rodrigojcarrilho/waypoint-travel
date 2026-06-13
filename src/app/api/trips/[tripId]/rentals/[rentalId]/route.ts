import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { deleteLinkedBookingExpense, syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  company: z.string().min(1).optional(),
  pickupLocation: z.string().min(1).optional(),
  dropoffLocation: z.string().optional(),
  pickupAt: z.string().optional(),
  returnAt: z.string().optional(),
  bookingRef: z.string().optional(),
  notes: z.string().optional(),
  ...bookingCostSchema,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string; rentalId: string }> }
) {
  const { tripId, rentalId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const existing = await prisma.carRental.findFirst({ where: { id: rentalId, tripId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { costAmount, costCurrency, expenseTracking, pickupAt, returnAt, ...rentalData } = parsed.data;

  const rental = await prisma.carRental.update({
    where: { id: rentalId },
    data: {
      ...rentalData,
      pickupAt: pickupAt ? new Date(pickupAt) : undefined,
      returnAt: returnAt ? new Date(returnAt) : undefined,
      costAmount: costAmount === null ? null : costAmount,
      costCurrency,
    },
  });

  if (parsed.data.expenseTracking !== undefined || parsed.data.costAmount !== undefined) {
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
      expenseTracking as BookingExpenseInput | null | undefined
    );
  }

  return NextResponse.json({ rental });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; rentalId: string }> }
) {
  const { tripId, rentalId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await deleteLinkedBookingExpense("linkedCarRentalId", rentalId);
  await prisma.carRental.delete({ where: { id: rentalId } });
  return NextResponse.json({ ok: true });
}
