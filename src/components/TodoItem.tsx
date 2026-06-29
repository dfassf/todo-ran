"use client";

import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import type { Todo, Category } from "@/types";
import { GripVertical, Trash2 } from "lucide-react";
import TapMethod from "./CompletionMethods/Tap";
import CountMethod from "./CompletionMethods/Count";
import TimerMethod from "./CompletionMethods/Timer";

export interface TodoItemProps extends HTMLAttributes<HTMLDivElement> {
  todo: Todo;
  category: Category | null;
  onUpdate: (patch: Partial<Todo>) => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  style?: CSSProperties;
}

const TodoItem = forwardRef<HTMLDivElement, TodoItemProps>(function TodoItem(
  {
    todo,
    category,
    onUpdate,
    onDelete,
    onEdit,
    dragHandleProps,
    isDragging = false,
    style,
    ...rest
  },
  ref
) {
  const done = !!todo.completed_at;
  const tint = category?.color ?? null;

  const renderMethod = () => {
    switch (todo.completion_method) {
      case "tap":
        return <TapMethod todo={todo} tint={tint} onUpdate={onUpdate} />;
      case "count":
        return <CountMethod todo={todo} tint={tint} onUpdate={onUpdate} />;
      case "timer":
        return <TimerMethod todo={todo} tint={tint} onUpdate={onUpdate} />;
    }
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`flex items-center gap-3 bg-bg px-5 py-3 transition-shadow ${
        isDragging ? "shadow-lg" : ""
      }`}
      {...rest}
    >
      <div className="flex-none">{renderMethod()}</div>

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left active:opacity-60"
          aria-label="할 일 수정"
        >
          <span
            className={`block truncate text-body ${done ? "text-muted line-through" : "text-text"}`}
          >
            {todo.title}
          </span>
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate text-body ${done ? "text-muted line-through" : "text-text"}`}
          >
            {todo.title}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm text-muted active:bg-surface-strong"
        aria-label="삭제"
      >
        <Trash2 size={16} />
      </button>

      {dragHandleProps && (
        <button
          type="button"
          {...dragHandleProps}
          className="flex h-8 w-8 flex-none cursor-grab touch-none items-center justify-center rounded-sm text-muted active:cursor-grabbing active:bg-surface-strong"
          aria-label="순서 변경"
        >
          <GripVertical size={18} />
        </button>
      )}
    </div>
  );
});

export default TodoItem;
