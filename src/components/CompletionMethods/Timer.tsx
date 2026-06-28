"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Todo } from "@/types";
import { Check, Play, Square } from "lucide-react";
import { triggerPushSoon } from "@/lib/sync/trigger";

interface Props {
  todo: Todo;
  tint?: string | null;
  onUpdate: (patch: Partial<Todo>) => Promise<void>;
}

const FALLBACK = "#D1D6DB";

// 항상 44px 원형 안에 들어가는 짧은 라벨 (시간 단위만)
const shortLabel = (sec: number): string => {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m`;
  return `${sec}s`;
};

export default function TimerMethod({ todo, tint, onUpdate }: Props) {
  const target = todo.target_seconds ?? 60;
  const done = !!todo.completed_at;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const color = tint ?? FALLBACK;

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const stop = useCallback(() => {
    setRunning(false);
    startedAt.current = null;
    setElapsed(0);
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (done) return;
    startedAt.current = Date.now();
    setRunning(true);
    const tick = () => {
      if (startedAt.current === null) return;
      const e = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(e);
      if (e >= target) {
        stop();
        onUpdate({ completed_at: new Date().toISOString() }).then(triggerPushSoon);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [done, target, onUpdate, stop]);

  const reset = async () => {
    await onUpdate({ completed_at: null });
    triggerPushSoon();
  };

  if (done) {
    return (
      <button
        type="button"
        onClick={reset}
        className="flex h-completion w-completion shrink-0 items-center justify-center rounded-full border-2 active:scale-95"
        style={{ borderColor: color, backgroundColor: color }}
        aria-label="취소"
      >
        <Check size={22} className="text-white" strokeWidth={3} />
      </button>
    );
  }

  const ratio = running ? Math.min(1, elapsed / target) : 0;
  const r = 18;
  const c = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={running ? stop : start}
      className="relative flex h-completion w-completion shrink-0 items-center justify-center active:scale-95"
      aria-label={running ? "정지" : "시작"}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        {running && (
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
        )}
      </svg>
      <span className="relative flex flex-col items-center justify-center">
        {running ? (
          <Square size={10} fill={color} stroke="none" />
        ) : (
          <Play size={12} fill={color} stroke="none" />
        )}
        <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color }}>
          {shortLabel(target)}
        </span>
      </span>
    </button>
  );
}
