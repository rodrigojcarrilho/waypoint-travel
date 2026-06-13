import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGuest } from "@/lib/auth";

export async function GET() {
  const guest = await getCurrentGuest();
  if (!guest) return NextResponse.json({ notifications: [] });

  const memberships = await prisma.tripMember.findMany({ where: { guestId: guest.id }, select: { id: true } });
  const memberIds = memberships.map((m) => m.id);

  const notifications = await prisma.notification.findMany({
    where: { memberId: { in: memberIds } },
    include: { trip: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const guest = await getCurrentGuest();
  if (!guest) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (body.markAllRead) {
    const memberships = await prisma.tripMember.findMany({ where: { guestId: guest.id }, select: { id: true } });
    await prisma.notification.updateMany({
      where: { memberId: { in: memberships.map((m) => m.id) }, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.notificationId) {
    await prisma.notification.update({
      where: { id: body.notificationId },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
