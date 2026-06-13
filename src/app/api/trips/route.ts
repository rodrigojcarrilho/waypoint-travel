import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getCurrentGuest, getOrCreateGuestSession } from "@/lib/auth";
import { logActivity, notifyTripMembers } from "@/lib/trip-service";
import { formatDestinations } from "@/lib/flight-itinerary";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  origin: z.string().max(200).optional(),
  destination: z.string().max(200).optional(),
  destinations: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string(),
  displayName: z.string().min(1).max(50).optional(),
});

export async function GET() {
  const guest = await getCurrentGuest();
  if (!guest) return NextResponse.json({ trips: [] });

  const memberships = await prisma.tripMember.findMany({
    where: { guestId: guest.id },
    include: {
      trip: {
        include: {
          members: { include: { guest: true, user: true } },
          _count: { select: { itineraryItems: true, flights: true, accommodations: true } },
        },
      },
    },
    orderBy: { trip: { startDate: "asc" } },
  });

  return NextResponse.json({
    trips: memberships.map((m) => ({
      ...m.trip,
      role: m.role,
      memberCount: m.trip.members.length,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const guest = await getOrCreateGuestSession(parsed.data.displayName);
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);

  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const destinations = parsed.data.destinations?.filter(Boolean) ?? [];
  const primaryDestination = destinations[0] ?? parsed.data.destination;

  const trip = await prisma.trip.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      origin: parsed.data.origin,
      destination: primaryDestination,
      destinations: destinations.length > 0 ? formatDestinations(destinations) : undefined,
      startDate,
      endDate,
      members: {
        create: { guestId: guest.id, role: "OWNER" },
      },
      invites: {
        create: {
          token: nanoid(24),
          role: "EDITOR",
          label: "Default invite",
        },
      },
    },
    include: {
      members: { include: { guest: true } },
      invites: true,
    },
  });

  const owner = trip.members[0];
  await logActivity(trip.id, owner.id, "trip", trip.id, "created", trip);

  return NextResponse.json({ trip });
}
