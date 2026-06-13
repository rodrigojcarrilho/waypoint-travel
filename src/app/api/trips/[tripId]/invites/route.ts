import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTripMember } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
  label: z.string().max(100).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId, "EDITOR");
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invite = await prisma.tripInvite.create({
    data: {
      tripId,
      token: nanoid(24),
      role: parsed.data.role,
      label: parsed.data.label,
    },
  });

  return NextResponse.json({ invite });
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const invites = await prisma.tripInvite.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}
