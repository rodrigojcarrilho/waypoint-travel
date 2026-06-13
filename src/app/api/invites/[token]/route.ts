import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateGuestSession, requireTripMember } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(1).max(50).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const invite = await prisma.tripInvite.findUnique({
    where: { token },
    include: { trip: true },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }
  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: "Invite has reached max uses" }, { status: 410 });
  }

  const guest = await getOrCreateGuestSession(parsed.success ? parsed.data.displayName : undefined);

  const existing = await prisma.tripMember.findFirst({
    where: { tripId: invite.tripId, guestId: guest.id },
  });

  if (existing) {
    return NextResponse.json({ tripId: invite.tripId, member: existing, alreadyMember: true });
  }

  const member = await prisma.tripMember.create({
    data: {
      tripId: invite.tripId,
      guestId: guest.id,
      role: invite.role,
    },
    include: { guest: true },
  });

  await prisma.tripInvite.update({
    where: { id: invite.id },
    data: { useCount: { increment: 1 } },
  });

  await logActivity(invite.tripId, member.id, "member", member.id, "joined", member);
  await notifyTripMembers(
    invite.tripId,
    "New traveler joined",
    `${guest.displayName} joined ${invite.trip.name}`,
    member.id,
    "MEMBER_JOINED"
  );

  return NextResponse.json({ tripId: invite.tripId, member });
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.tripInvite.findUnique({
    where: { token },
    include: { trip: { select: { id: true, name: true, destination: true, startDate: true, endDate: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

  return NextResponse.json({
    invite: {
      role: invite.role,
      label: invite.label,
      trip: invite.trip,
    },
  });
}
