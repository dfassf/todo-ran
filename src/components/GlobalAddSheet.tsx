"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Category, CompletionMethod } from "@/types";
import CategoryDot from "./CategoryDot";
import Sheet from "./ui/Sheet";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import MethodTile from "./ui/MethodTile";
import { useCategories } from "@/hooks/useCategories";
import { useUserId } from "@/hooks/useUserId";
import { createTodo } from "@/lib/db/repo";
import { todayString } from "@/lib/date";
import { dispatchTodoChanged } from "@/lib/events";

// UI 노출은 3종만. DB CHECK는 8종 그대로 유지 (기존 데이터/추후 확장).
const METHOD_OPTIONS: { value: CompletionMethod; label: string; hint: string }[] = [
  { value: "tap", label: "탭", hint: "한 번 탭하면 완료돼요" },
  { value: "count", label: "횟수", hint: "정한 횟수만큼 탭해요" },
  { value: "timer", label: "타이머", hint: "시간을 채우면 완료돼요" },
];

const HIDDEN_ROUTES = ["/settings", "/login"];

export default function GlobalAddSheet() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDDEN_ROUTES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute right-5 bottom-[88px] flex h-fab w-fab items-center justify-center rounded-full bg-accent text-white shadow-fab transition-transform active:scale-95"
          aria-label="새 할 일"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>

      <AddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userId } = useUserId();
  const { categories } = useCategories();
  const today = todayString();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [method, setMethod] = useState<CompletionMethod>("tap");
  const [targetCount, setTargetCount] = useState(5);
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDueDate(today);
    setCategoryId(null);
    setMethod("tap");
    setTargetCount(5);
    setTargetSeconds(60);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!userId || !title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTodo({
        userId,
        categoryId,
        title: title.trim(),
        dueDate,
        completionMethod: method,
        targetCount: method === "count" ? targetCount : null,
        targetSeconds: method === "timer" ? targetSeconds : null,
      });
      dispatchTodoChanged();
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const currentHint = METHOD_OPTIONS.find((m) => m.value === method)?.hint;

  return (
    <Sheet open={open} onClose={handleClose} title="새 할 일">
      <Input
        autoFocus
        placeholder="무엇을 하실 건가요?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="mt-5">
        <p className="mb-2 text-sub font-medium text-text-sub">날짜</p>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sub font-medium text-text-sub">카테고리</p>
        {categories.length === 0 ? (
          <p className="text-caption text-muted">
            카테고리가 없어요. 설정에서 먼저 만들어 주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            <Chip selected={categoryId === null} onClick={() => setCategoryId(null)}>
              없음
            </Chip>
            {categories.map((c: Category) => (
              <Chip
                key={c.id}
                selected={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                <CategoryDot color={c.color} size={8} />
                {c.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sub font-medium text-text-sub">완수 방식</p>
        <div className="grid grid-cols-3 gap-2">
          {METHOD_OPTIONS.map((m) => (
            <MethodTile
              key={m.value}
              label={m.label}
              selected={method === m.value}
              onClick={() => setMethod(m.value)}
            />
          ))}
        </div>
        <p className="mt-2 text-caption text-muted">{currentHint}</p>
      </div>

      {method === "count" && (
        <div className="mt-4">
          <Input
            type="number"
            label="목표 횟수"
            min={1}
            value={targetCount}
            onChange={(e) => setTargetCount(Math.max(1, Number(e.target.value)))}
          />
        </div>
      )}
      {method === "timer" && (
        <div className="mt-4">
          <Input
            type="number"
            label="목표 시간 (초)"
            min={1}
            value={targetSeconds}
            onChange={(e) => setTargetSeconds(Math.max(1, Number(e.target.value)))}
          />
        </div>
      )}

      <div className="mt-8 flex gap-3 pb-2">
        <Button variant="secondary" fullWidth onClick={handleClose}>
          취소
        </Button>
        <Button fullWidth onClick={submit} disabled={!title.trim() || submitting}>
          {submitting ? "추가 중…" : "추가"}
        </Button>
      </div>
    </Sheet>
  );
}
