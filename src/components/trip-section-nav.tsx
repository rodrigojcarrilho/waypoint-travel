"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {active.icon}
        {active.label}
        <ChevronDown className={cn("h-4 w-4 opacity-80 transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          className="absolute left-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          role="listbox"
        >
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                role="option"
                aria-selected={section.id === activeId}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                  section.id === activeId
                    ? "bg-brand-50 font-medium text-brand-800"
                    : "text-slate-700 hover:bg-brand-50"
                )}
                onClick={() => {
                  onChange(section.id);
                  setOpen(false);
                }}
              >
                {section.icon}
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
