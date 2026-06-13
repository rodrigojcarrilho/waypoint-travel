"use client";

import { useEffect } from "react";
import { Users } from "lucide-react";

type PresenceUser = {
  memberId: string;
  name: string;
  section: string | null;
};

export function usePresence(tripId: string, section: string) {
  useEffect(() => {
    let active = true;

    const ping = () => {
      if (!active) return;
      fetch(`/api/trips/${tripId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tripId, section]);
}

export function PresenceBanner({ presence }: { presence: PresenceUser[] }) {
  if (presence.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <Users className="h-4 w-4 shrink-0" />
      <span>
        {presence.map((p) => p.name).join(", ")} {presence.length === 1 ? "is" : "are"} also viewing
        {presence.some((p) => p.section) && (
          <> ({presence.filter((p) => p.section).map((p) => p.section).join(", ")})</>
        )}
      </span>
    </div>
  );
}
