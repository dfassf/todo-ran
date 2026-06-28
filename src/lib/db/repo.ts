import { getDb, META_KEYS } from "./dexie";
import type { Category, Todo, CompletionMethod, SyncOp } from "@/types";

const nowIso = (): string => new Date().toISOString();

// ─── 게스트 user_id ──────────────────────────────────────────
export const getOrCreateGuestUserId = async (): Promise<string> => {
  const db = getDb();
  const entry = await db.meta.get(META_KEYS.guestUserId);
  if (entry) return entry.value;
  const id = crypto.randomUUID();
  await db.meta.put({ key: META_KEYS.guestUserId, value: id });
  return id;
};

export const clearGuestUserId = async (): Promise<void> => {
  const db = getDb();
  await db.meta.delete(META_KEYS.guestUserId);
};

export const getLastPulledAt = async (): Promise<string | null> => {
  const db = getDb();
  const entry = await db.meta.get(META_KEYS.lastPulledAt);
  return entry?.value ?? null;
};

export const setLastPulledAt = async (iso: string): Promise<void> => {
  const db = getDb();
  await db.meta.put({ key: META_KEYS.lastPulledAt, value: iso });
};

// ─── Categories ──────────────────────────────────────────
export const listCategories = async (userId: string): Promise<Category[]> => {
  const db = getDb();
  const rows = await db.categories.where("user_id").equals(userId).toArray();
  return rows.filter((r) => !r.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
};

export const createCategory = async (params: {
  userId: string;
  label: string;
  color: string;
  sortOrder?: number;
}): Promise<Category> => {
  const db = getDb();
  const now = nowIso();
  const cat: Category = {
    id: crypto.randomUUID(),
    user_id: params.userId,
    label: params.label,
    color: params.color,
    sort_order: params.sortOrder ?? Date.now(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.categories.put(cat);
  await enqueue({ op: "upsert", table: "categories", row_id: cat.id, payload: cat });
  return cat;
};

export const updateCategory = async (
  id: string,
  patch: Partial<Pick<Category, "label" | "color" | "sort_order">>
): Promise<Category | null> => {
  const db = getDb();
  const cur = await db.categories.get(id);
  if (!cur) return null;
  const next: Category = { ...cur, ...patch, updated_at: nowIso() };
  await db.categories.put(next);
  await enqueue({ op: "upsert", table: "categories", row_id: id, payload: next });
  return next;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const db = getDb();
  const cur = await db.categories.get(id);
  if (!cur) return;
  const next: Category = { ...cur, deleted_at: nowIso(), updated_at: nowIso() };
  await db.categories.put(next);
  await enqueue({ op: "delete", table: "categories", row_id: id, payload: next });
};

// ─── Todos ──────────────────────────────────────────
export const listTodosByDate = async (userId: string, dueDate: string): Promise<Todo[]> => {
  const db = getDb();
  const rows = await db.todos.where("[user_id+due_date]").equals([userId, dueDate]).toArray();
  return rows.filter((r) => !r.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
};

export const listAllTodos = async (userId: string): Promise<Todo[]> => {
  const db = getDb();
  const rows = await db.todos.where("user_id").equals(userId).toArray();
  return rows
    .filter((r) => !r.deleted_at)
    .sort((a, b) =>
      a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.sort_order - b.sort_order
    );
};

export const createTodo = async (params: {
  userId: string;
  categoryId: string | null;
  title: string;
  dueDate: string;
  completionMethod: CompletionMethod;
  targetCount?: number | null;
  targetSeconds?: number | null;
}): Promise<Todo> => {
  const db = getDb();
  const now = nowIso();
  const todo: Todo = {
    id: crypto.randomUUID(),
    user_id: params.userId,
    category_id: params.categoryId,
    title: params.title,
    due_date: params.dueDate,
    completion_method: params.completionMethod,
    target_count: params.targetCount ?? null,
    target_seconds: params.targetSeconds ?? null,
    current_count: 0,
    completed_at: null,
    sort_order: Date.now(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.todos.put(todo);
  await enqueue({ op: "upsert", table: "todos", row_id: todo.id, payload: todo });
  return todo;
};

export const updateTodo = async (id: string, patch: Partial<Todo>): Promise<Todo | null> => {
  const db = getDb();
  const cur = await db.todos.get(id);
  if (!cur) return null;
  const next: Todo = { ...cur, ...patch, updated_at: nowIso() };
  await db.todos.put(next);
  await enqueue({ op: "upsert", table: "todos", row_id: id, payload: next });
  return next;
};

export const deleteTodo = async (id: string): Promise<void> => {
  const db = getDb();
  const cur = await db.todos.get(id);
  if (!cur) return;
  const next: Todo = { ...cur, deleted_at: nowIso(), updated_at: nowIso() };
  await db.todos.put(next);
  await enqueue({ op: "delete", table: "todos", row_id: id, payload: next });
};

// 순서 일괄 재배치 — 새 순서대로 sort_order 1000, 2000, ...로 재할당.
// 같은 row에 여러 변경이 누적돼도 sync engine이 마지막 op만 push.
export const reorderTodos = async (orderedIds: string[]): Promise<void> => {
  const db = getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const cur = await db.todos.get(id);
    if (!cur) continue;
    const next: Todo = { ...cur, sort_order: (i + 1) * 1000, updated_at: nowIso() };
    await db.todos.put(next);
    await enqueue({ op: "upsert", table: "todos", row_id: id, payload: next });
  }
};

// ─── Sync queue ──────────────────────────────────────────
const enqueue = async (op: Omit<SyncOp, "id" | "created_at">) => {
  const db = getDb();
  await db.sync_queue.add({ ...op, created_at: Date.now() });
};

export const drainQueue = async (): Promise<SyncOp[]> => {
  const db = getDb();
  const ops = await db.sync_queue.orderBy("created_at").toArray();
  return ops;
};

export const clearQueue = async (): Promise<void> => {
  const db = getDb();
  await db.sync_queue.clear();
};

// ─── 게스트 → 사용자 user_id 이관 (2단계) ──────────────────────────────────
// 1단계: 메모리에서만 user_id 교체된 사본을 만든다. DB는 안 건드림.
//        서버 upsert가 실패하면 로컬은 원상태 그대로 → 재시도 가능.
export const prepareReassignedRows = async (
  fromUserId: string,
  toUserId: string
): Promise<{ categories: Category[]; todos: Todo[] }> => {
  const db = getDb();
  const cats = await db.categories.where("user_id").equals(fromUserId).toArray();
  const tds = await db.todos.where("user_id").equals(fromUserId).toArray();
  const now = nowIso();

  return {
    categories: cats.map((c) => ({ ...c, user_id: toUserId, updated_at: now })),
    todos: tds.map((t) => ({ ...t, user_id: toUserId, updated_at: now })),
  };
};

// 2단계: 서버 upsert 성공 후에만 호출. 로컬을 새 user_id로 일괄 교체.
export const commitReassignedRows = async (
  categories: Category[],
  todos: Todo[]
): Promise<void> => {
  const db = getDb();
  await db.categories.bulkPut(categories);
  await db.todos.bulkPut(todos);
};

// 게스트 시절 쌓인 sync_queue를 전부 비운다.
// 이관 성공 직후 호출 — 이미 서버에 다 올렸으니 큐를 비워도 손실 없음.
// 안 비우면 옛 payload의 user_id(게스트 id)가 RLS에 막혀 영영 실패함.
export const clearQueueForGuestPayloads = async (guestUserId: string): Promise<void> => {
  const db = getDb();
  const all = await db.sync_queue.toArray();
  const stale = all.filter((op) => {
    const payload = op.payload as { user_id?: string };
    return payload.user_id === guestUserId;
  });
  if (stale.length === 0) return;
  await db.sync_queue.bulkDelete(stale.map((s) => s.id!).filter((id) => id !== undefined));
};
