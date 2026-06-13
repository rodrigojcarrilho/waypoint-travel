"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GuestGate, getStoredDisplayName } from "@/components/guest-gate";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatDate } from "@/lib/utils";

function InviteContent() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [displayName, setDisplayName] = useState(getStoredDisplayName());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${params.token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid invite");
        return res.json();
      })
      .then((data) => setInvite(data.invite))
      .catch(() => setError("This invite link is invalid or expired"))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function joinTrip() {
    setJoining(true);
    const res = await fetch(`/api/invites/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() || "Guest" }),
    });

    if (!res.ok) {
      setError("Could not join trip");
      setJoining(false);
      return;
    }

    const data = await res.json();
    if (displayName.trim()) localStorage.setItem("waypoint_display_name", displayName.trim());
    router.push(`/trips/${data.tripId}`);
  }

  if (loading) return <p className="text-slate-500">Loading invite...</p>;

  if (error) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="text-slate-700">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/")}>
          Go home
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-in">
      <Card>
        <p className="text-sm uppercase tracking-wide text-brand-600">You&apos;re invited</p>
        <h1 className="mt-2 text-2xl font-bold">{invite.trip.name}</h1>
        {invite.trip.destination && <p className="mt-1 text-slate-600">{invite.trip.destination}</p>}
        <p className="mt-3 text-sm text-slate-500">
          {formatDate(invite.trip.startDate)} – {formatDate(invite.trip.endDate)}
        </p>
        <p className="mt-4 text-sm text-slate-600">
          You&apos;ll join as <strong>{invite.role.toLowerCase()}</strong>
        </p>

        <div className="mt-6">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>

        <Button className="mt-4 w-full" onClick={joinTrip} disabled={joining}>
          {joining ? "Joining..." : "Join trip"}
        </Button>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <GuestGate>
      <InviteContent />
    </GuestGate>
  );
}
