import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";
import { buildTripIcs } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      itineraryItems: true,
      flights: true,
      accommodations: true,
      transfers: true,
    },
  });

  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ics = buildTripIcs({
    trip,
    itineraryItems: trip.itineraryItems,
    flights: trip.flights,
    accommodations: trip.accommodations,
    transfers: trip.transfers,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${trip.name.replace(/[^a-z0-9]/gi, "_")}.ics"`,
    },
  });
}
