import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ tripId: string; expenseId: string }> }) {
  const { tripId, expenseId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ ok: true });
}
