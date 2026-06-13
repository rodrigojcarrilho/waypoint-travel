"use client";

import { useState } from "react";
import { Input, Label } from "./ui";

export function DestinationTagsInput({
  value,
  onChange,
  placeholder = "Add a stop and press Enter",
}: {
  value: string[];
  onChange: (destinations: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function addDestination() {
    const next = input.trim();
    if (!next || value.includes(next)) {
      setInput("");
      return;
    }
    onChange([...value, next]);
    setInput("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((dest) => (
          <span
            key={dest}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-800"
          >
            {dest}
            <button
              type="button"
              className="text-brand-600 hover:text-brand-900"
              onClick={() => onChange(value.filter((d) => d !== dest))}
              aria-label={`Remove ${dest}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDestination();
            }
          }}
        />
        <button
          type="button"
          onClick={addDestination}
          className="shrink-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          Add
        </button>
      </div>
      {value.length > 1 && (
        <p className="mt-1 text-xs text-slate-500">Multiple stops will show as {value.join(" → ")}</p>
      )}
    </div>
  );
}
