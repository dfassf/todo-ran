"use client";

import { useState, type FormEvent } from "react";
import type { Category, CompletionMethod } from "@/types";
import CategoryDot from "./CategoryDot";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import MethodTile from "./ui/MethodTile";
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
  const { categories } = useCategories();

  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [method, setMethod] = useState<CompletionMethod>(initial.method);
  const [targetCount, setTargetCount] = useState(initial.targetCount);
  const [targetSeconds, setTargetSeconds] = useState(initial.targetSeconds);
  const [submitting, setSubmitting] = useState(false);

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
        {categories.length === 0 ? (
          <p className="text-caption text-muted">카테고리가 없어요. 설정에서 먼저 만들어 주세요.</p>
        ) : (
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
