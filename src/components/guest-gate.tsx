"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label } from "./ui";

export function GuestGate({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("waypoint_display_name");
    if (stored) {
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: stored }),
      })
        .then(() => setReady(true))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function join() {
    if (!displayName.trim()) return;
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() }),
    });
    localStorage.setItem("waypoint_display_name", displayName.trim());
    setReady(true);
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading...</div>;
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md animate-fade-in py-16">
        <div className="rounded-2xl border border-white/70 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-brand-900">Welcome to Waypoint</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your name to start planning trips with friends and family. No account required for now.
          </p>
          <div className="mt-6 space-y-3">
            <div>
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                placeholder="Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
              />
            </div>
            <Button className="w-full" onClick={join}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function getStoredDisplayName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("waypoint_display_name") ?? "";
}
