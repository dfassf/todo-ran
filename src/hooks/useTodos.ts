"use client";

import { useCallback, useEffect, useState } from "react";
import type { Todo, CompletionMethod } from "@/types";
import {
  listTodosByDate,
  listAllTodos,
  createTodo as repoCreate,
  updateTodo as repoUpdate,
  deleteTodo as repoDelete,
} from "@/lib/db/repo";
import { useUserId } from "./useUserId";
import { TODO_CHANGED, dispatchTodoChanged } from "@/lib/events";

export interface NewTodoInput {
  title: string;
  dueDate: string;
  categoryId: string | null;
  completionMethod: CompletionMethod;
  targetCount?: number | null;
  targetSeconds?: number | null;
}

export const useTodosByDate = (dueDate: string) => {
  const { userId } = useUserId();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const rows = await listTodosByDate(userId, dueDate);
    setTodos(rows);
    setLoading(false);
  }, [userId, dueDate]);

  useEffect(() => {
    // IndexedDB(외부 시스템) → state 동기화. 의도된 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onChange = () => refresh();
    window.addEventListener(TODO_CHANGED, onChange);
    return () => window.removeEventListener(TODO_CHANGED, onChange);
  }, [refresh]);

  const create = async (input: NewTodoInput) => {
    if (!userId) return;
    await repoCreate({ userId, ...input });
    dispatchTodoChanged();
  };

  const update = async (id: string, patch: Partial<Todo>) => {
    await repoUpdate(id, patch);
    dispatchTodoChanged();
  };

  const remove = async (id: string) => {
    await repoDelete(id);
    dispatchTodoChanged();
  };

  return { todos, loading, create, update, remove, refresh };
};

export const useAllTodos = () => {
  const { userId } = useUserId();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const rows = await listAllTodos(userId);
    setTodos(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // IndexedDB(외부 시스템) → state 동기화. 의도된 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onChange = () => refresh();
    window.addEventListener(TODO_CHANGED, onChange);
    return () => window.removeEventListener(TODO_CHANGED, onChange);
  }, [refresh]);

  return { todos, loading, refresh };
};
