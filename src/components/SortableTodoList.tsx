"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
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

interface Props {
  todos: Todo[];
  catMap: Map<string, Category>;
  onUpdate: (id: string, patch: Partial<Todo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

// 한 그룹 (같은 due_date) 안에서의 sortable.
// 다른 그룹으로의 이동은 부모(DateGroupedSortable)가 처리.
export default function SortableTodoList({
  todos,
  catMap,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  // 외부에서 todos가 갱신되면 로컬 임시 순서 리셋
  const displayTodos = orderedIds
    ? (orderedIds.map((id) => todos.find((t) => t.id === id)).filter(Boolean) as Todo[])
    : todos;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayTodos.findIndex((t) => t.id === active.id);
    const newIndex = displayTodos.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(displayTodos, oldIndex, newIndex);
    const nextIds = next.map((t) => t.id);
    setOrderedIds(nextIds);
    await onReorder(nextIds);
    // 외부 refresh가 따라오면 setOrderedIds(null)로 외부 진실에 양보
    setOrderedIds(null);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={displayTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-border">
          {displayTodos.map((t) => (
            <SortableRow
              key={t.id}
              todo={t}
              category={t.category_id ? (catMap.get(t.category_id) ?? null) : null}
              onUpdate={(patch) => onUpdate(t.id, patch)}
              onDelete={() => onDelete(t.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  todo,
  category,
  onUpdate,
  onDelete,
}: {
  todo: Todo;
  category: Category | null;
  onUpdate: (patch: Partial<Todo>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : 0,
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
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}
