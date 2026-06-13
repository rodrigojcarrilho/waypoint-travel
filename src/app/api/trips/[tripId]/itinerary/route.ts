import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { notifyMemberByEmail } from "@/lib/email";

const schema = z.object({
  dayDate: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["ACTIVITY", "MEAL", "TRANSFER", "OTHER"]).default("ACTIVITY"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await prisma.itineraryItem.count({ where: { tripId } });

  let latitude = parsed.data.latitude;
  let longitude = parsed.data.longitude;
  let location = parsed.data.location;
  if ((!latitude || !longitude) && location?.trim()) {
    const geo = await geocodeAddress(location);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      if (!location.includes(",")) location = geo.displayName;
    }
  }

  const item = await prisma.itineraryItem.create({
    data: {
      tripId,
      dayDate: new Date(parsed.data.dayDate),
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      location,
      latitude,
      longitude,
      sortOrder: count,
    },
  });

  await logActivity(tripId, member.id, "itinerary", item.id, "created", item);
  await notifyTripMembers(tripId, "Itinerary updated", `Added "${item.title}"`, member.id);

  const members = await prisma.tripMember.findMany({
    where: { tripId, id: { not: member.id } },
    include: { user: true },
  });
  await Promise.all(
    members.map((m) => notifyMemberByEmail(m.user?.email, "Itinerary updated", `Added "${item.title}" to the trip`))
  );

  return NextResponse.json({ item });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const items = await prisma.itineraryItem.findMany({
    where: { tripId },
    orderBy: [{ dayDate: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({ items });
}
