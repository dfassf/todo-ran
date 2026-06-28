import Dexie, { type Table } from "dexie";
import type { Category, Todo, SyncOp, MetaEntry } from "@/types";

class TodoRanDB extends Dexie {
  categories!: Table<Category, string>;
  todos!: Table<Todo, string>;
  sync_queue!: Table<SyncOp, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("todo-ran");
    this.version(1).stores({
      categories: "id, user_id, updated_at, deleted_at",
      todos: "id, user_id, due_date, [user_id+due_date], updated_at, deleted_at",
      sync_queue: "++id, created_at",
      meta: "key",
    });
  }
}

let _db: TodoRanDB | null = null;

export const getDb = (): TodoRanDB => {
  if (typeof window === "undefined") {
    throw new Error("Dexie는 브라우저 환경에서만 사용 가능합니다");
  }
  if (!_db) _db = new TodoRanDB();
  return _db;
};

export const META_KEYS = {
  guestUserId: "guestUserId",
  lastPulledAt: "lastPulledAt",
  autoSeeded: "autoSeeded",
} as const;
