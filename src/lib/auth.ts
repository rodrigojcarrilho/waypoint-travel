import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "./db";

export const SESSION_COOKIE = "waypoint_session";

export async function getOrCreateGuestSession(displayName?: string) {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  if (existing) {
    const guest = await prisma.guest.findUnique({ where: { sessionToken: existing } });
    if (guest) {
      if (displayName && displayName !== guest.displayName) {
        return prisma.guest.update({
          where: { id: guest.id },
          data: { displayName },
        });
      }
      return guest;
    }
  }

  const name = displayName?.trim() || "Guest";

  // Demo convenience: if a seeded guest exists for this name, adopt it so the
  // pre-populated demo trip is visible. Scoped to demo tokens only.
  const demoToken = `${name.toLowerCase()}-demo-session-token`;
  const demoGuest = await prisma.guest.findUnique({ where: { sessionToken: demoToken } });
  if (demoGuest) {
    cookieStore.set(SESSION_COOKIE, demoToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return demoGuest;
  }

  const sessionToken = nanoid(32);
  const guest = await prisma.guest.create({
    data: { displayName: name, sessionToken },
  });

  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return guest;
}

export async function getCurrentGuest() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return prisma.guest.findUnique({ where: { sessionToken: token } });
}

export async function getCurrentMemberForTrip(tripId: string) {
  const guest = await getCurrentGuest();
  if (!guest) return null;

  return prisma.tripMember.findFirst({
    where: { tripId, guestId: guest.id },
    include: { guest: true, user: true },
  });
}

export async function requireTripMember(tripId: string, minRole: "VIEWER" | "EDITOR" | "OWNER" = "VIEWER") {
  const member = await getCurrentMemberForTrip(tripId);
  if (!member) return null;

  const roleRank = { VIEWER: 0, EDITOR: 1, OWNER: 2 };
  if (roleRank[member.role] < roleRank[minRole]) return null;

  return member;
}
