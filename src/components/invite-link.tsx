"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui";

export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the input below is selectable as a fallback.
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Join my trip on Waypoint", url });
        return;
      } catch {
        // user cancelled or share failed — fall back to copy
      }
    }
    copy();
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <p className="text-sm font-medium text-brand-900">Share this invite link</p>
      <p className="mt-0.5 text-xs text-brand-700/80">Anyone with the link can join and help plan.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs text-brand-900 outline-none ring-brand-500 focus:ring-2"
          aria-label="Invite link"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={copy} className="flex-1 sm:flex-none">
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {canShare && (
            <Button size="sm" variant="secondary" onClick={share} className="flex-1 sm:flex-none">
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
