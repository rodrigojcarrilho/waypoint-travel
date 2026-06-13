import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { syncTransferToItinerary } from "@/lib/stay-itinerary";
import { deleteLinkedBookingExpense, syncBookingExpense, type BookingExpenseInput } from "@/lib/booking-expense";
import { bookingCostSchema } from "@/lib/booking-expense-api";

const TRANSFER_LINK_PREFIX = "linked-transfer:";

const schema = z.object({
  title: z.string().min(1).optional(),
  fromLocation: z.string().min(1).optional(),
  toLocation: z.string().min(1).optional(),
  datetime: z.string().optional(),
  transportType: z.string().optional(),
  bookingRef: z.string().optional(),
  notes: z.string().optional(),
  ...bookingCostSchema,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string; transferId: string }> }
) {
  const { tripId, transferId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { costAmount, costCurrency, expenseTracking, datetime, ...transferData } = parsed.data;

  const transfer = await prisma.transfer.update({
    where: { id: transferId },
    data: {
      ...transferData,
      datetime: datetime ? new Date(datetime) : undefined,
      costAmount: costAmount === null ? null : costAmount,
      costCurrency,
    },
  });

  if (parsed.data.expenseTracking !== undefined || parsed.data.costAmount !== undefined) {
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
      expenseTracking as BookingExpenseInput | null | undefined
    );
  }

  await syncTransferToItinerary(tripId, transfer);

  return NextResponse.json({ transfer });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; transferId: string }> }
) {
  const { tripId, transferId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await deleteLinkedBookingExpense("linkedTransferId", transferId);
  await prisma.itineraryItem.deleteMany({
    where: { tripId, description: { contains: `${TRANSFER_LINK_PREFIX}${transferId}` } },
  });
  await prisma.transfer.delete({ where: { id: transferId } });
  return NextResponse.json({ ok: true });
}
