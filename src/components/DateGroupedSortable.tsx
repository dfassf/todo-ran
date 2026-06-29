"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo, Category } from "@/types";
import TodoItem from "./TodoItem";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatMonthDayWithWeekday } from "@/lib/date";

interface DateGroup {
  date: string; // yyyy-mm-dd
  todos: Todo[];
}

interface Props {
  groups: DateGroup[];
  catMap: Map<string, Category>;
  onUpdate: (id: string, patch: Partial<Todo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>; // 같은 날 안에서 순서
  onMoveDate: (id: string, newDate: string) => Promise<void>; // 다른 날로 이동
  onEdit?: (todo: Todo) => void;
}

// 그룹별 todo id 맵. dndId는 단순히 todo.id 그대로 사용.
export default function DateGroupedSortable({
  groups,
  catMap,
  onUpdate,
  onDelete,
  onReorder,
  onMoveDate,
  onEdit,
}: Props) {
  // 외부 groups 변화 우선. drag 직후 잠깐 임시 상태가 필요하면 setLocalGroups로 처리.
  const [localGroups, setLocalGroups] = useState<DateGroup[] | null>(null);
  const display = localGroups ?? groups;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    todo: Todo;
    fromDate: string;
    toDate: string;
  } | null>(null);

  const allIds = useMemo(() => display.flatMap((g) => g.todos.map((t) => t.id)), [display]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const findGroupOfId = (id: string): { groupIndex: number; itemIndex: number } | null => {
    for (let gi = 0; gi < display.length; gi++) {
      const idx = display[gi].todos.findIndex((t) => t.id === id);
      if (idx >= 0) return { groupIndex: gi, itemIndex: idx };
    }
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const src = findGroupOfId(String(active.id));
    const dst = findGroupOfId(String(over.id));
    if (!src || !dst) return;

    const srcGroup = display[src.groupIndex];
    const dstGroup = display[dst.groupIndex];

    if (src.groupIndex === dst.groupIndex) {
      // 같은 날 안에서 순서 변경
      const reordered = arrayMove(srcGroup.todos, src.itemIndex, dst.itemIndex);
      const newGroups = display.map((g, i) =>
        i === src.groupIndex ? { ...g, todos: reordered } : g
      );
      setLocalGroups(newGroups);
      await onReorder(reordered.map((t) => t.id));
      setLocalGroups(null);
      return;
    }

    // 다른 날로 이동 — 확인 받기
    const todo = srcGroup.todos[src.itemIndex];
    setPendingMove({ todo, fromDate: srcGroup.date, toDate: dstGroup.date });
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const { todo, toDate } = pendingMove;
    setPendingMove(null);
    await onMoveDate(todo.id, toDate);
  };

  const activeTodo = activeId
    ? allIds.includes(activeId)
      ? (display.flatMap((g) => g.todos).find((t) => t.id === activeId) ?? null)
      : null
    : null;
  const activeCategory = activeTodo?.category_id
    ? (catMap.get(activeTodo.category_id) ?? null)
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          {display.map((group) => (
            <section key={group.date}>
              <h3 className="bg-surface px-5 py-2 text-caption font-semibold text-text-sub">
                {formatMonthDayWithWeekday(group.date)}
              </h3>
              <ul className="divide-y divide-border">
                {group.todos.map((t) => (
                  <SortableRow
                    key={t.id}
                    todo={t}
                    category={t.category_id ? (catMap.get(t.category_id) ?? null) : null}
                    onUpdate={(patch) => onUpdate(t.id, patch)}
                    onDelete={() => onDelete(t.id)}
                    onEdit={onEdit ? () => onEdit(t) : undefined}
                  />
                ))}
              </ul>
            </section>
          ))}
        </SortableContext>

        <DragOverlay>
          {activeTodo ? (
            <TodoItem
              todo={activeTodo}
              category={activeCategory}
              onUpdate={async () => {}}
              onDelete={async () => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={!!pendingMove}
        title={pendingMove ? `${formatMonthDayWithWeekday(pendingMove.toDate)}로 옮길까요?` : ""}
        description={pendingMove ? `"${pendingMove.todo.title}"의 날짜를 변경합니다.` : ""}
        confirmLabel="옮기기"
        onConfirm={confirmMove}
        onCancel={() => setPendingMove(null)}
      />
    </>
  );
}

function SortableRow({
  todo,
  category,
  onUpdate,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  category: Category | null;
  onUpdate: (patch: Partial<Todo>) => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li>
      <TodoItem
        ref={setNodeRef}
        style={style}
        todo={todo}
        category={category}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEdit={onEdit}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}
