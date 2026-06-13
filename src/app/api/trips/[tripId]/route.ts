import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentGuest, requireTripMember } from "@/lib/auth";
import { computeBalances, getActivePresence, simplifyDebts } from "@/lib/trip-service";
import { buildCalendarEvents } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      members: { include: { guest: true, user: true } },
      itineraryItems: { orderBy: [{ dayDate: "asc" }, { sortOrder: "asc" }] },
      flights: { orderBy: { departureTime: "asc" } },
      accommodations: { orderBy: { checkIn: "asc" } },
      transfers: { orderBy: { datetime: "asc" } },
      carRentals: { orderBy: { pickupAt: "asc" } },
      expenses: {
        include: {
          paidBy: { include: { guest: true, user: true } },
          splits: { include: { member: { include: { guest: true, user: true } } } },
        },
        orderBy: { expenseDate: "desc" },
      },
      invites: true,
      activityLogs: {
        include: { member: { include: { guest: true, user: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const balances = computeBalances(trip.members, trip.expenses);
  const settlements = simplifyDebts(balances);
  const calendarEvents = buildCalendarEvents({
    trip,
    itineraryItems: trip.itineraryItems,
    flights: trip.flights,
    accommodations: trip.accommodations,
    transfers: trip.transfers,
  });
  const presence = await getActivePresence(tripId, member.id);

  return NextResponse.json({
    trip,
    currentMember: member,
    balances,
    settlements,
    calendarEvents,
    presence,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      name: body.name,
      description: body.description,
      destination: body.destination,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
  });

  return NextResponse.json({ trip });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "OWNER");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await prisma.trip.delete({ where: { id: tripId } });
  return NextResponse.json({ ok: true });
}
