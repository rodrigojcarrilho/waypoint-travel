import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTripMember } from "@/lib/auth";
import { updatePresence } from "@/lib/trip-service";

const schema = z.object({
  section: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const member = await requireTripMember(tripId);
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  await updatePresence(tripId, member.id, parsed.success ? parsed.data.section : undefined);
  return NextResponse.json({ ok: true });
}
