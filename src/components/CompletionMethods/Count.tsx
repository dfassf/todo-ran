"use client";

import type { Todo } from "@/types";
import { Check } from "lucide-react";
import { triggerPushSoon } from "@/lib/sync/trigger";

interface Props {
  todo: Todo;
  tint?: string | null;
  onUpdate: (patch: Partial<Todo>) => Promise<void>;
}

const FALLBACK = "#D1D6DB";

export default function CountMethod({ todo, tint, onUpdate }: Props) {
  const target = todo.target_count ?? 1;
  const cur = todo.current_count;
  const done = !!todo.completed_at;
  const ratio = Math.min(1, cur / target);
  const color = tint ?? FALLBACK;

  const handleClick = async () => {
    if (done) {
      await onUpdate({ current_count: 0, completed_at: null });
      triggerPushSoon();
      return;
    }
    const next = cur + 1;
    const reached = next >= target;
    await onUpdate({
      current_count: next,
      completed_at: reached ? new Date().toISOString() : null,
    });
    triggerPushSoon();
  };

  if (done) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex h-completion w-completion shrink-0 items-center justify-center rounded-full border-2 active:scale-95"
        style={{ borderColor: color, backgroundColor: color }}
        aria-label="취소"
      >
        <Check size={22} className="text-white" strokeWidth={3} />
      </button>
    );
  }

  const r = 18;
  const c = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex h-completion w-completion shrink-0 items-center justify-center active:scale-95"
      aria-label={`${cur}/${target}`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative text-tiny font-bold" style={{ color }}>
        {cur}/{target}
      </span>
    </button>
  );
}
