import { NextResponse } from "next/server";
import { requireTripMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncAllRouteToItinerary } from "@/lib/stay-itinerary";

export async function POST(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await syncAllRouteToItinerary(tripId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      itineraryItems: { orderBy: [{ dayDate: "asc" }, { sortOrder: "asc" }] },
      accommodations: true,
    },
  });

  return NextResponse.json({ ok: true, trip });
}
