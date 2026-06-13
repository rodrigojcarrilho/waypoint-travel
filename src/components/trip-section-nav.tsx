"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type TripSection = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export function TripSectionNav({
  sections,
  activeId,
  onChange,
}: {
  sections: TripSection[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the active tab in view when it changes (helpful on mobile horizontal scroll).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Trip sections"
      className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {sections.map((section) => {
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(section.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
            )}
          >
            <span className={cn(isActive ? "text-white" : "text-slate-400")}>{section.icon}</span>
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
