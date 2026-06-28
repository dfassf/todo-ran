export type CompletionMethod = "tap" | "count" | "timer";

export interface Category {
  id: string;
  user_id: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Todo {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  due_date: string;

  completion_method: CompletionMethod;
  target_count: number | null;
  target_seconds: number | null;

  current_count: number;
  completed_at: string | null;

  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type SyncOpType = "upsert" | "delete";
export type SyncTable = "categories" | "todos";

export interface SyncOp {
  id?: number;
  op: SyncOpType;
  table: SyncTable;
  row_id: string;
  payload: Category | Todo;
  created_at: number;
}

export interface MetaEntry {
  key: string;
  value: string;
}
