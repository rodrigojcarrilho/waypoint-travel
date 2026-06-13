import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGuestSession } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().min(1).max(50),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
  }

  const guest = await getOrCreateGuestSession(parsed.data.displayName);
  return NextResponse.json({ guest: { id: guest.id, displayName: guest.displayName } });
}
