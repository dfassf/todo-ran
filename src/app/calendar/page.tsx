"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import {
  formatYearMonth,
  getMonthGrid,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  toDateString,
  fromDateString,
  formatMonthDayWithWeekday,
} from "@/lib/date";
import { useAllTodos, useTodosByDate } from "@/hooks/useTodos";
import { useCategories } from "@/hooks/useCategories";
import CategoryDot from "@/components/CategoryDot";
import SortableTodoList from "@/components/SortableTodoList";
import EditTodoSheet from "@/components/EditTodoSheet";
import EmptyState from "@/components/EmptyState";
import { reorderTodos } from "@/lib/db/repo";
import { dispatchTodoChanged } from "@/lib/events";
import { useSwipe } from "@/hooks/useSwipe";
import { useSelectedDate } from "@/components/SelectedDateProvider";
import type { Todo } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState(toDateString(new Date()));
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  // 슬라이드 방향: 다음 달로 가면 "next" → 새 그리드가 오른쪽에서 들어옴
  const [slideDir, setSlideDir] = useState<"next" | "prev" | null>(null);

  // 선택된 날짜를 전역 컨텍스트와 동기화 — + 버튼 누르면 이 날짜로 추가됨
  const { setSelectedDate } = useSelectedDate();
  useEffect(() => {
    setSelectedDate(selected);
  }, [selected, setSelectedDate]);

  const goNext = () => {
    setSlideDir("next");
    setAnchor((a) => addMonths(a, 1));
  };
  const goPrev = () => {
    setSlideDir("prev");
    setAnchor((a) => subMonths(a, 1));
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  const grid = useMemo(() => getMonthGrid(anchor), [anchor]);
  const anchorKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  const slideClass =
    slideDir === "next" ? "slide-in-from-right" : slideDir === "prev" ? "slide-in-from-left" : "";
  const { todos: allTodos } = useAllTodos();
  const { categories } = useCategories();
  const { todos: dayTodos, update, remove } = useTodosByDate(selected);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const todosByDate = useMemo(() => {
    const m = new Map<string, typeof allTodos>();
    for (const t of allTodos) {
      const arr = m.get(t.due_date) ?? [];
      arr.push(t);
      m.set(t.due_date, arr);
    }
    return m;
  }, [allTodos]);

  const monthLabel = formatYearMonth(anchor);

  return (
    <div>
      <PageHeader
        title="캘린더"
        rightSlot={
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setAnchor(now);
              setSelected(toDateString(now));
            }}
            className="rounded-sm bg-surface-strong px-3 py-1.5 text-caption font-semibold text-text-sub active:bg-border"
          >
            오늘
          </button>
        }
      />

      <div className="flex items-center justify-between px-5 pb-3">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-sub active:bg-surface-strong"
          aria-label="이전 달"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-title">{monthLabel}</h2>
        <button
          type="button"
          onClick={goNext}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-sub active:bg-surface-strong"
          aria-label="다음 달"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div {...swipeHandlers} className="touch-pan-y select-none overflow-hidden">
        <div key={anchorKey} className={slideClass}>
          <div className="grid grid-cols-7 px-3 pb-1 text-center text-caption text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-4">
            {grid.map((d) => {
              const dateStr = toDateString(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayTodos2 = todosByDate.get(dateStr) ?? [];
              const isSelected = isSameDay(d, fromDateString(selected));
              const today = isToday(d);

              const dots = dayTodos2
                .slice(0, 3)
                .map((t) => (t.category_id ? catMap.get(t.category_id)?.color : null))
                .filter(Boolean) as string[];

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelected(dateStr)}
                  className="flex aspect-square flex-col items-center justify-center"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sub transition-colors ${
                      isSelected
                        ? "bg-accent text-white font-bold"
                        : today
                          ? "text-accent font-bold"
                          : inMonth
                            ? "text-text"
                            : "text-muted"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="mt-1 flex h-1.5 items-center gap-0.5">
                    {dots.map((c, i) => (
                      <CategoryDot key={i} color={c} size={4} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 border-t border-border">
        <h3 className="px-5 pt-5 pb-2 text-sub font-semibold text-text-sub">
          {formatMonthDayWithWeekday(selected)}
        </h3>
        {dayTodos.length === 0 ? (
          <EmptyState title="이 날 할 일이 없어요" />
        ) : (
          <SortableTodoList
            todos={dayTodos}
            catMap={catMap}
            onUpdate={(id, patch) => update(id, patch)}
            onDelete={(id) => remove(id)}
            onReorder={async (orderedIds) => {
              await reorderTodos(orderedIds);
              dispatchTodoChanged();
            }}
            onEdit={setEditingTodo}
          />
        )}
      </div>

      <EditTodoSheet todo={editingTodo} onClose={() => setEditingTodo(null)} />
    </div>
  );
}
