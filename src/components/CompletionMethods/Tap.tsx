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

export default function TapMethod({ todo, tint, onUpdate }: Props) {
  const done = !!todo.completed_at;
  const color = tint ?? FALLBACK;

  const handleClick = async () => {
    await onUpdate({ completed_at: done ? null : new Date().toISOString() });
    triggerPushSoon();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-completion w-completion shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-95"
      style={{
        borderColor: color,
        backgroundColor: done ? color : "transparent",
      }}
      aria-label={done ? "취소" : "완료"}
    >
      {done && <Check size={22} className="text-white" strokeWidth={3} />}
    </button>
  );
}
