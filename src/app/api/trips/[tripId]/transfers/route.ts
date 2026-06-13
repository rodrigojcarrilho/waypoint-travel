import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { syncTransferToItinerary } from "@/lib/stay-itinerary";
import { syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostCreateSchema } from "@/lib/booking-expense-api";

const schema = z.object({
  title: z.string().min(1),
  fromLocation: z.string().min(1),
  toLocation: z.string().min(1),
  datetime: z.string(),
  transportType: z.string().optional(),
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

  const { costAmount, costCurrency, expenseTracking, datetime, ...transferData } = parsed.data;

  const transfer = await prisma.transfer.create({
    data: {
      tripId,
      ...transferData,
      datetime: new Date(datetime),
      costAmount,
      costCurrency,
    },
  });

  if (costAmount && expenseTracking) {
    await syncBookingExpense(
      tripId,
      "linkedTransferId",
      transfer.id,
      {
        title: `Transfer: ${transfer.title}`,
        expenseDate: transfer.datetime,
        costAmount: transfer.costAmount,
        costCurrency: transfer.costCurrency,
      },
      expenseTracking as BookingExpenseInput
    );
  }

  await logActivity(tripId, member.id, "transfer", transfer.id, "created", transfer);
  await notifyTripMembers(tripId, "Transfer added", `${transfer.title}: ${transfer.fromLocation} → ${transfer.toLocation}`, member.id);
  await syncTransferToItinerary(tripId, transfer);

  return NextResponse.json({ transfer });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const transfers = await prisma.transfer.findMany({
    where: { tripId },
    orderBy: { datetime: "asc" },
  });

  return NextResponse.json({ transfers });
}
