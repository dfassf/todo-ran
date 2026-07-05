"use client";

import { useState, type FormEvent } from "react";
import type { Category, CompletionMethod } from "@/types";
import CategoryDot from "./CategoryDot";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import MethodTile from "./ui/MethodTile";
import Stepper from "./ui/Stepper";
import CategoryPicker from "./CategoryPicker";
import { DEFAULT_COLORS } from "@/lib/colors";
import { Plus, X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

const METHOD_OPTIONS: { value: CompletionMethod; label: string; hint: string }[] = [
  { value: "tap", label: "탭", hint: "한 번 탭하면 완료돼요" },
  { value: "count", label: "횟수", hint: "정한 횟수만큼 탭해요" },
  { value: "timer", label: "타이머", hint: "시간을 채우면 완료돼요" },
];

export interface TodoFormValues {
  title: string;
  dueDate: string;
  categoryId: string | null;
  method: CompletionMethod;
  targetCount: number;
  targetSeconds: number;
}

interface Props {
  initial: TodoFormValues;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
  onSubmit: (values: TodoFormValues) => Promise<void>;
}

// 할 일 추가/수정 공통 폼.
// "추가"든 "수정"이든 입력 필드 구성·검증 로직이 같으므로 한 곳에서 관리.
export default function TodoForm({
  initial,
  submitLabel,
  submittingLabel,
  onCancel,
  onSubmit,
}: Props) {
  const { categories, create: createCategory } = useCategories();

  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [method, setMethod] = useState<CompletionMethod>(initial.method);
  const [targetCount, setTargetCount] = useState(initial.targetCount);
  const [targetSeconds, setTargetSeconds] = useState(initial.targetSeconds);
  const [submitting, setSubmitting] = useState(false);

  // 카테고리 인라인 추가 UI 상태.
  // "+ 새 카테고리" 탭 시 폼 펼치고, 저장하면 이 폼에서 바로 사용 가능하게
  // 새로 만든 카테고리를 자동 선택.
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLORS[0].value);
  const [newCatSaving, setNewCatSaving] = useState(false);

  const saveNewCategory = async () => {
    const label = newCatLabel.trim();
    if (!label || newCatSaving) return;
    setNewCatSaving(true);
    try {
      const created = await createCategory(label, newCatColor);
      if (created) setCategoryId(created.id); // 방금 만든 것 자동 선택
      setNewCatOpen(false);
      setNewCatLabel("");
      setNewCatColor(DEFAULT_COLORS[0].value);
    } finally {
      setNewCatSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        dueDate,
        categoryId,
        method,
        targetCount,
        targetSeconds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentHint = METHOD_OPTIONS.find((m) => m.value === method)?.hint;

  return (
    <form onSubmit={handleSubmit}>
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
        <div className="flex flex-wrap gap-x-2 gap-y-2">
          <Chip selected={categoryId === null} onClick={() => setCategoryId(null)}>
            없음
          </Chip>
          {categories.map((c: Category) => (
            <Chip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              <CategoryDot color={c.color} size={8} />
              {c.label}
            </Chip>
          ))}
          {/* 설정 페이지로 가지 않고 이 시트 안에서 즉시 만들 수 있게. */}
          <button
            type="button"
            onClick={() => setNewCatOpen((v) => !v)}
            aria-expanded={newCatOpen}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sub text-text-sub active:bg-surface"
          >
            {newCatOpen ? <X size={14} /> : <Plus size={14} />}새 카테고리
          </button>
        </div>

        {newCatOpen && (
          <div className="mt-3 rounded-md bg-surface p-3">
            <Input
              autoFocus
              placeholder="이름 (예: 운동)"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
            />
            <div className="mt-3">
              <CategoryPicker value={newCatColor} onChange={setNewCatColor} />
            </div>
            <Button
              className="mt-3"
              fullWidth
              type="button"
              size="md"
              onClick={saveNewCategory}
              disabled={!newCatLabel.trim() || newCatSaving}
            >
              {newCatSaving ? "만드는 중…" : "추가"}
            </Button>
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
          <Stepper
            label="목표 횟수"
            value={targetCount}
            min={1}
            max={999}
            suffix="회"
            onChange={setTargetCount}
          />
        </div>
      )}
      {method === "timer" && (
        <div className="mt-4">
          {/* 저장은 초 단위지만 UI는 분 단위로 다룸.
              사용자는 5분/25분/1시간 같은 자연어 단위로 시간을 인지함. */}
          <Stepper
            label="목표 시간"
            value={Math.max(1, Math.round(targetSeconds / 60))}
            min={1}
            max={240}
            suffix="분"
            onChange={(mins) => setTargetSeconds(mins * 60)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[5, 10, 15, 25, 45, 60].map((m) => {
              const selected = targetSeconds === m * 60;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetSeconds(m * 60)}
                  className={[
                    "h-8 rounded-full px-3 text-sub transition-colors",
                    selected
                      ? "bg-accent-soft text-accent font-medium"
                      : "bg-surface-strong text-text-sub active:bg-border",
                  ].join(" ")}
                >
                  {m < 60 ? `${m}분` : `${m / 60}시간`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3 pb-2">
        <Button variant="secondary" fullWidth onClick={onCancel} type="button">
          취소
        </Button>
        <Button type="submit" fullWidth disabled={!title.trim() || submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
