"use client";

import { DEFAULT_COLORS } from "@/lib/colors";
import { Check, Plus } from "lucide-react";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export default function CategoryPicker({ value, onChange }: Props) {
  const isCustom = !DEFAULT_COLORS.some((c) => c.value.toLowerCase() === value.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-2">
      {DEFAULT_COLORS.map((c) => {
        const selected = c.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ backgroundColor: c.value }}
            aria-label={c.name}
          >
            {selected && <Check size={16} className="text-white" strokeWidth={3} />}
          </button>
        );
      })}
      <label
        className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95 ${
          isCustom ? "ring-2 ring-text" : ""
        }`}
        style={{ backgroundColor: isCustom ? value : "var(--color-surface-strong)" }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="커스텀 색상"
        />
        {isCustom ? (
          <Check size={16} className="text-white" strokeWidth={3} />
        ) : (
          <Plus size={16} className="text-muted" />
        )}
      </label>
    </div>
  );
}
