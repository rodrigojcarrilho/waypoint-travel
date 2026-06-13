import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { buildExpenseSplits, validateSplitTotal } from "@/lib/expense-splits";

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  paidById: z.string(),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
  splitType: z.enum(["PERSONAL", "SHARED"]).default("SHARED"),
  splitMode: z.enum(["EQUAL", "CUSTOM"]).default("EQUAL"),
  memberIds: z.array(z.string()).optional(),
  splits: z.array(z.object({ memberId: z.string(), amount: z.number().nonnegative() })).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const allMembers = await prisma.tripMember.findMany({ where: { tripId } });
  const memberIds =
    parsed.data.splitType === "PERSONAL"
      ? [parsed.data.paidById]
      : parsed.data.memberIds?.length
        ? parsed.data.memberIds
        : allMembers.map((m) => m.id);

  let splits: Array<{ memberId: string; amount: number }>;

  if (parsed.data.splitType === "PERSONAL") {
    splits = [{ memberId: parsed.data.paidById, amount: parsed.data.amount }];
  } else if (parsed.data.splitMode === "CUSTOM" && parsed.data.splits?.length) {
    splits = parsed.data.splits;
  } else {
    splits = buildExpenseSplits({
      splitType: parsed.data.splitType,
      splitMode: "EQUAL",
      amount: parsed.data.amount,
      paidById: parsed.data.paidById,
      memberIds,
    });
  }

  if (!validateSplitTotal(parsed.data.amount, splits, parsed.data.splitType)) {
    return NextResponse.json({ error: "Split amounts must equal expense total" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      tripId,
      title: parsed.data.title,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paidById: parsed.data.paidById,
      expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : new Date(),
      notes: parsed.data.notes,
      splitType: parsed.data.splitType,
      splitMode: parsed.data.splitMode,
      splits: { create: splits },
    },
    include: {
      paidBy: { include: { guest: true, user: true } },
      splits: { include: { member: { include: { guest: true, user: true } } } },
    },
  });

  await logActivity(tripId, member.id, "expense", expense.id, "created", expense);
  await notifyTripMembers(tripId, "Expense added", `${expense.title} (${expense.currency} ${expense.amount})`, member.id, "EXPENSE_ADDED");

  return NextResponse.json({ expense });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const expenses = await prisma.expense.findMany({
    where: { tripId },
    include: {
      paidBy: { include: { guest: true, user: true } },
      splits: { include: { member: { include: { guest: true, user: true } } } },
    },
    orderBy: { expenseDate: "desc" },
  });

  return NextResponse.json({ expenses });
}
