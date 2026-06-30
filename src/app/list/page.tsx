"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAllTodos } from "@/hooks/useTodos";
import { useCategories } from "@/hooks/useCategories";
import EmptyState from "@/components/EmptyState";
import DateGroupedSortable from "@/components/DateGroupedSortable";
import EditTodoSheet from "@/components/EditTodoSheet";
import { updateTodo, deleteTodo, reorderTodos } from "@/lib/db/repo";
import { dispatchTodoChanged } from "@/lib/events";
import { todayString } from "@/lib/date";
import { useSelectedDate } from "@/components/SelectedDateProvider";
import type { Todo } from "@/types";

export default function ListPage() {
  const [query, setQuery] = useState("");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const { todos, refresh } = useAllTodos();
  const { categories } = useCategories();

  // 리스트 페이지에서 + 누르면 오늘 날짜로 추가됨
  const { setSelectedDate } = useSelectedDate();
  useEffect(() => {
    setSelectedDate(todayString());
  }, [setSelectedDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter((t) => t.title.toLowerCase().includes(q));
  }, [todos, query]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const arr = m.get(t.due_date) ?? [];
      arr.push(t);
      m.set(t.due_date, arr);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, items]) => ({ date, todos: items }));
  }, [filtered]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div>
      <PageHeader title="할 일" />

      <div className="px-5 pb-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-control-md w-full rounded-md bg-surface-strong pl-11 pr-4 text-sub text-text placeholder:text-muted outline-none transition-colors focus:border focus:border-accent focus:bg-bg"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="할 일이 없어요"
          description={query ? "검색 결과가 없어요" : "우측 하단 + 버튼으로 추가하세요"}
        />
      ) : (
        <DateGroupedSortable
          groups={groups}
          catMap={catMap}
          onUpdate={async (id, patch) => {
            await updateTodo(id, patch);
            dispatchTodoChanged();
          }}
          onDelete={async (id) => {
            await deleteTodo(id);
            dispatchTodoChanged();
          }}
          onReorder={async (orderedIds) => {
            await reorderTodos(orderedIds);
            dispatchTodoChanged();
          }}
          onMoveDate={async (id, newDate) => {
            await updateTodo(id, { due_date: newDate });
            dispatchTodoChanged();
            await refresh();
          }}
          onEdit={setEditingTodo}
        />
      )}

      <EditTodoSheet todo={editingTodo} onClose={() => setEditingTodo(null)} />
    </div>
  );
}
