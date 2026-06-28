import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDb } from "@/lib/db/dexie";
import { drainQueue, clearQueue, getLastPulledAt, setLastPulledAt } from "@/lib/db/repo";
import { mergeLww } from "./merge";
import type { Category, Todo, SyncOp } from "@/types";

const PULL_TABLES = ["categories", "todos"] as const;

// sync는 Supabase가 실제로 연결된 상태에서만 동작.
// placeholder env / 미설정 env에서는 noop으로 빠짐.
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return (
    !!url && !!key && !url.includes("placeholder") && !key.includes("placeholder")
  );
};

const getAuthedUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
};

// 큐에서 영구 실패할 항목들을 제거.
// 페이로드의 user_id가 현재 인증된 사용자와 다르면 (=게스트 시절 잔재 또는 다른 계정 데이터)
// 어차피 RLS에서 막힌다. 재시도해도 안 되니 폐기.
const purgeStaleOps = async (ops: SyncOp[], authedId: string): Promise<SyncOp[]> => {
  const db = getDb();
  const live: SyncOp[] = [];
  const staleIds: number[] = [];

  for (const op of ops) {
    const payloadUserId = (op.payload as { user_id?: string }).user_id;
    if (payloadUserId && payloadUserId !== authedId) {
      if (op.id !== undefined) staleIds.push(op.id);
    } else {
      live.push(op);
    }
  }

  if (staleIds.length > 0) {
    console.warn(`[sync] ${staleIds.length}개 큐 항목 폐기 (user_id 불일치)`);
    await db.sync_queue.bulkDelete(staleIds);
  }

  return live;
};

// ─── push: 로컬 sync_queue → 서버 upsert ──────────────────────────────────
export const pushPending = async (): Promise<{ pushed: number; failed: number }> => {
  const ops = await drainQueue();
  if (ops.length === 0) return { pushed: 0, failed: 0 };

  // 로그인되지 않았거나 Supabase 미설정이면 큐 보존한 채 noop.
  // 게스트 데이터는 가입 시점의 마이그레이션에서 일괄 push 처리됨.
  const authedId = await getAuthedUserId();
  if (!authedId) return { pushed: 0, failed: 0 };

  // 영구 실패할 항목 (다른 user_id 페이로드) 미리 제거
  const liveOps = await purgeStaleOps(ops, authedId);
  if (liveOps.length === 0) {
    // stale만 있었으면 큐는 이미 비워졌음
    await clearQueue();
    return { pushed: 0, failed: 0 };
  }

  const supabase = createSupabaseBrowserClient();

  // 같은 row_id에 대한 마지막 op만 적용 (중간 변경 누적 절약)
  const latest = new Map<string, SyncOp>();
  for (const op of liveOps) {
    latest.set(`${op.table}:${op.row_id}`, op);
  }

  let failed = 0;
  const byTable: Record<string, unknown[]> = { categories: [], todos: [] };
  for (const op of latest.values()) {
    byTable[op.table].push(op.payload);
  }

  for (const table of PULL_TABLES) {
    const rows = byTable[table];
    if (rows.length === 0) continue;
    const { error } = await supabase.from(table).upsert(rows as never);
    if (error) {
      console.error(`[sync] push ${table} failed:`, error.message);
      failed += rows.length;
    }
  }

  if (failed === 0) await clearQueue();
  return { pushed: latest.size - failed, failed };
};

// ─── pull: 서버 변경분 → 로컬 머지 ──────────────────────────────────
export const pullChanges = async (userId: string): Promise<{ pulled: number }> => {
  const supabase = createSupabaseBrowserClient();
  const db = getDb();
  const lastPulled = (await getLastPulledAt()) ?? "1970-01-01T00:00:00Z";
  const newPulledAt = new Date().toISOString();

  let pulled = 0;

  // categories
  {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", lastPulled);
    if (error) throw error;

    for (const remote of (data ?? []) as Category[]) {
      const local = await db.categories.get(remote.id);
      const merged = mergeLww(local ?? null, remote);
      if (merged) {
        await db.categories.put(merged);
        pulled++;
      }
    }
  }

  // todos
  {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", lastPulled);
    if (error) throw error;

    for (const remote of (data ?? []) as Todo[]) {
      const local = await db.todos.get(remote.id);
      const merged = mergeLww(local ?? null, remote);
      if (merged) {
        await db.todos.put(merged);
        pulled++;
      }
    }
  }

  await setLastPulledAt(newPulledAt);
  return { pulled };
};

// ─── sync: push → pull ──────────────────────────────────
export const sync = async (userId: string) => {
  const push = await pushPending();
  const pull = await pullChanges(userId);
  return { push, pull };
};
