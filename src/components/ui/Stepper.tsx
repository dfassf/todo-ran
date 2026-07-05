"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

interface Props {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
}

// 숫자 인풋을 스테퍼(-/+)로 대체하되, 값 자체는 탭해서 직접 입력 가능.
//
// ─── 왜 하이브리드인가 ─────────────────────────
// 순수 스테퍼만 두면 100단위 값 세팅이 지옥.
// 순수 인풋만 두면 iOS 자동 확대 + 백스페이스 튐 문제.
// → 평소엔 텍스트(스테퍼용), 탭하면 인풋(자유 입력용) 전환.
//
// ─── 어포던스 ─────────────────────────
// 값 부분을 별도 pill(bg-bg)로 감싸서 "이 부분이 별도로 눌리는 컨트롤" 임을 명시.
// 편집 진입 시 pill이 확장돼서 인풋이 되고 테두리 강조.
// Chip이 이 앱에서 "탭 가능 요소"로 학습돼 있어 재활용.
export default function Stepper({
  label,
  value,
  min = 1,
  max = 999,
  step = 1,
  suffix,
  onChange,
}: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const n = Number(draft);
    if (Number.isFinite(n) && draft !== "") onChange(clamp(Math.round(n)));
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <div>
      <span className="mb-2 block text-sub font-medium text-text-sub">{label}</span>
      <div className="flex h-control-lg items-center justify-between rounded-md bg-surface-strong px-1">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label="줄이기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-sub active:bg-border disabled:opacity-30"
        >
          <Minus size={18} />
        </button>

        {editing ? (
          <div className="flex h-10 items-center rounded-sm border border-accent bg-bg px-3 transition-colors">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(String(value));
                }
              }}
              className="w-16 bg-transparent text-center text-body text-text tabular-nums outline-none"
            />
            {suffix && <span className="ml-1 text-body text-text-sub">{suffix}</span>}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label={`${label} 직접 입력`}
            className="flex h-10 items-center rounded-sm bg-bg px-4 transition-colors active:bg-border"
          >
            <span className="text-body text-text tabular-nums">{value}</span>
            {suffix && <span className="ml-1 text-body text-text-sub">{suffix}</span>}
          </button>
        )}

        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label="늘리기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-sub active:bg-border disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
