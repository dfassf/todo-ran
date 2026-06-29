"use client";

import type { Todo } from "@/types";
import Sheet from "./ui/Sheet";
import TodoForm from "./TodoForm";
import { updateTodo } from "@/lib/db/repo";
import { dispatchTodoChanged } from "@/lib/events";

interface Props {
  todo: Todo | null;
  onClose: () => void;
}

// 할 일 수정 시트. 항목 탭하면 열림.
// 완수 방식이 바뀌면 진행 상태(current_count)는 초기화 — 다른 방식의 진행값이 의미 없으므로.
export default function EditTodoSheet({ todo, onClose }: Props) {
  if (!todo) return null;

  return (
    <Sheet open={!!todo} onClose={onClose} title="할 일 수정">
      <TodoForm
        initial={{
          title: todo.title,
          dueDate: todo.due_date,
          categoryId: todo.category_id,
          method: todo.completion_method,
          targetCount: todo.target_count ?? 5,
          targetSeconds: todo.target_seconds ?? 60,
        }}
        submitLabel="저장"
        submittingLabel="저장 중…"
        onCancel={onClose}
        onSubmit={async (values) => {
          const methodChanged = values.method !== todo.completion_method;
          await updateTodo(todo.id, {
            title: values.title,
            due_date: values.dueDate,
            category_id: values.categoryId,
            completion_method: values.method,
            target_count: values.method === "count" ? values.targetCount : null,
            target_seconds: values.method === "timer" ? values.targetSeconds : null,
            // 완수 방식이 바뀌면 진행값 초기화
            ...(methodChanged ? { current_count: 0, completed_at: null } : {}),
          });
          dispatchTodoChanged();
          onClose();
        }}
      />
    </Sheet>
  );
}
