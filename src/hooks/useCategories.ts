"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/types";
import {
  listCategories,
  createCategory as repoCreate,
  updateCategory as repoUpdate,
  deleteCategory as repoDelete,
} from "@/lib/db/repo";
import { useUserId } from "./useUserId";
import { CATEGORY_CHANGED, dispatchCategoryChanged } from "@/lib/events";

export const useCategories = () => {
  const { userId } = useUserId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const rows = await listCategories(userId);
    setCategories(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // IndexedDB(외부 시스템) → 로컬 state 동기화. 룰이 false positive로 잡지만 의도된 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CATEGORY_CHANGED, onChange);
    return () => window.removeEventListener(CATEGORY_CHANGED, onChange);
  }, [refresh]);

  const create = async (label: string, color: string) => {
    if (!userId) return;
    await repoCreate({ userId, label, color });
    dispatchCategoryChanged();
  };

  const update = async (
    id: string,
    patch: Partial<Pick<Category, "label" | "color" | "sort_order">>
  ) => {
    await repoUpdate(id, patch);
    dispatchCategoryChanged();
  };

  const remove = async (id: string) => {
    await repoDelete(id);
    dispatchCategoryChanged();
  };

  return { categories, loading, create, update, remove, refresh };
};
