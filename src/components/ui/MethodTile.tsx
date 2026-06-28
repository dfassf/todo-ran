"use client";

import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
}

// 완수 방식 선택 타일. grid 안에서도 항상 같은 높이.
export default function MethodTile({ label, selected = false, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      className={[
        "flex h-control-md items-center justify-center rounded-md text-sub font-medium transition-colors",
        selected
          ? "bg-accent-soft text-accent"
          : "bg-surface-strong text-text-sub active:bg-border",
        className,
      ].join(" ")}
      {...rest}
    >
      {label}
    </button>
  );
}
