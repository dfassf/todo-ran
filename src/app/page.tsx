"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import EmptyState from "@/components/EmptyState";
import SortableTodoList from "@/components/SortableTodoList";
import EditTodoSheet from "@/components/EditTodoSheet";
import { useTodosByDate } from "@/hooks/useTodos";
import { useCategories } from "@/hooks/useCategories";
import { todayString, isPast, formatMonthDay } from "@/lib/date";
import { reorderTodos } from "@/lib/db/repo";
import { dispatchTodoChanged } from "@/lib/events";
import type { Todo } from "@/types";

type Tab = "today" | "past";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("today");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const today = todayString();

  const { categories } = useCategories();
  const todayQuery = useTodosByDate(today);

  const visible: Todo[] = useMemo(() => {
    if (tab === "today") return todayQuery.todos;
    return todayQuery.todos.filter((t) => isPast(t.due_date) && !t.completed_at);
  }, [tab, todayQuery.todos]);

  const total = todayQuery.todos.length;
  const done = todayQuery.todos.filter((t) => !!t.completed_at).length;

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div>
      <PageHeader title={formatMonthDay(today)} subtitle="오늘 하루도 화이팅이에요" />

      <div className="mx-5 mb-4 flex gap-1 rounded-md bg-surface-strong p-1">
        <TabButton active={tab === "today"} onClick={() => setTab("today")}>
          오늘 할 일
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          지난 할 일
        </TabButton>
      </div>

      <ProgressBar total={total} done={done} />

      {visible.length === 0 ? (
        <EmptyState
          title={tab === "today" ? "오늘 할 일이 없어요" : "지난 미완료가 없어요"}
          description={tab === "today" ? "우측 하단 + 버튼으로 추가해 보세요" : undefined}
        />
      ) : (
        <SortableTodoList
          todos={visible}
          catMap={catMap}
          onUpdate={(id, patch) => todayQuery.update(id, patch)}
          onDelete={(id) => todayQuery.remove(id)}
          onReorder={async (orderedIds) => {
            await reorderTodos(orderedIds);
            dispatchTodoChanged();
          }}
          onEdit={setEditingTodo}
        />
      )}

      <EditTodoSheet todo={editingTodo} onClose={() => setEditingTodo(null)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-sm text-sub font-semibold transition-colors ${
        active ? "bg-bg text-text shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}
