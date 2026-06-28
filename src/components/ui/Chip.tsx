"use client";

import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export default function Chip({ selected = false, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-control-sm items-center gap-1.5 rounded-sm px-3 text-sub font-medium transition-colors",
        selected
          ? "bg-accent-soft text-accent"
          : "bg-surface-strong text-text-sub active:bg-border",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
