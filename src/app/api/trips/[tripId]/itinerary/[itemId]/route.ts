import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";

const schema = z.object({
  dayDate: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["ACTIVITY", "MEAL", "TRANSFER", "OTHER"]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string; itemId: string }> }) {
  const { tripId, itemId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const existing = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: {
      ...parsed.data,
      dayDate: parsed.data.dayDate ? new Date(parsed.data.dayDate) : undefined,
    },
  });

  await logActivity(tripId, member.id, "itinerary", item.id, "updated", { before: existing, after: item });
  await notifyTripMembers(tripId, "Itinerary updated", `Updated "${item.title}"`, member.id);

  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tripId: string; itemId: string }> }) {
  const { tripId, itemId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const existing = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.itineraryItem.delete({ where: { id: itemId } });
  await logActivity(tripId, member.id, "itinerary", itemId, "deleted", existing);

  return NextResponse.json({ ok: true });
}
