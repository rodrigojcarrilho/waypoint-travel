"use client";

import type { JourneyStop } from "@/lib/airports";

export function JourneyRouteBanner({ stops }: { stops: JourneyStop[] }) {
  if (stops.length < 2) return null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Your journey</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {stops.map((stop, index) => (
          <div key={stop.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-900">{stop.city}</p>
                {stop.country && <p className="text-xs text-slate-500">{stop.country}</p>}
              </div>
            </div>
            {index < stops.length - 1 && (
              <div className="flex items-center gap-1 text-brand-500">
                <span className="hidden h-px w-6 bg-brand-300 sm:block" />
                <span aria-hidden>→</span>
                <span className="hidden h-px w-6 bg-brand-300 sm:block" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
