import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Category, Todo } from "@/types";

// ─── Supabase 모킹 ──────────────────────────────────
interface FakeSupabaseState {
  categories: Category[];
  todos: Todo[];
  upsertedCategories: Category[];
  upsertedTodos: Todo[];
  upsertError: string | null;
  upsertCallCount: number;
}

const state: FakeSupabaseState = {
  categories: [],
  todos: [],
  upsertedCategories: [],
  upsertedTodos: [],
  upsertError: null,
  upsertCallCount: 0,
};

const resetState = () => {
  state.categories = [];
  state.todos = [];
  state.upsertedCategories = [];
  state.upsertedTodos = [];
  state.upsertError = null;
  state.upsertCallCount = 0;
};

// engine이 isSupabaseConfigured()로 환경변수를 보기 때문에 테스트에서도 placeholder 아닌 값 필요
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }),
    },
    from: (table: string) => {
      const upsert = async (rows: unknown[]) => {
        state.upsertCallCount++;
        if (state.upsertError) return { error: { message: state.upsertError } };
        if (table === "categories") state.upsertedCategories.push(...(rows as Category[]));
        if (table === "todos") state.upsertedTodos.push(...(rows as Todo[]));
        return { error: null };
      };
      const select = () => {
        let userFilter: string | null = null;
        let updatedAtGt: string | null = null;
        const builder = {
          eq(_col: string, val: string) {
            userFilter = val;
            return builder;
          },
          gt(_col: string, val: string) {
            updatedAtGt = val;
            return builder;
          },
          async then(resolve: (v: { data: (Category | Todo)[]; error: null }) => void) {
            const src: (Category | Todo)[] =
              table === "categories" ? state.categories : state.todos;
            const data = src.filter(
              (r) =>
                (!userFilter || r.user_id === userFilter) &&
                (!updatedAtGt || r.updated_at > updatedAtGt)
            );
            resolve({ data, error: null });
          },
        };
        return builder;
      };
      return { upsert, select };
    },
  }),
}));

// import는 모킹 후에
import { getDb } from "@/lib/db/dexie";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createTodo,
  setLastPulledAt,
  getLastPulledAt,
} from "@/lib/db/repo";
import { pushPending, pullChanges } from "@/lib/sync/engine";

const wipe = async () => {
  const db = getDb();
  await db.categories.clear();
  await db.todos.clear();
  await db.sync_queue.clear();
  await db.meta.clear();
  resetState();
};

beforeEach(async () => {
  await wipe();
});

const userId = "user-a";

describe("pushPending", () => {
  it("큐가 비어있으면 noop", async () => {
    const r = await pushPending();
    expect(r).toEqual({ pushed: 0, failed: 0 });
    expect(state.upsertCallCount).toBe(0);
  });

  it("같은 row에 대한 upsert 여러 번이면 최종 1번만 push (중복 제거)", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    await updateCategory(cat.id, { label: "운동/스트레칭" });
    await updateCategory(cat.id, { label: "운동/스트레칭/요가" });
    // 큐에 3개 op 누적
    const r = await pushPending();
    expect(r.pushed).toBe(1);
    expect(state.upsertedCategories).toHaveLength(1);
    expect(state.upsertedCategories[0].label).toBe("운동/스트레칭/요가");
  });

  it("upsert 후 delete가 있으면 delete 페이로드 (soft-deleted row)만 push", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    await deleteCategory(cat.id);
    const r = await pushPending();
    expect(r.pushed).toBe(1);
    expect(state.upsertedCategories).toHaveLength(1);
    expect(state.upsertedCategories[0].deleted_at).not.toBeNull();
  });

  it("다른 row는 각각 push", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    await createCategory({ userId, label: "B", color: "#000000" });
    const r = await pushPending();
    expect(r.pushed).toBe(2);
    expect(state.upsertedCategories).toHaveLength(2);
  });

  it("categories와 todos 섞여있어도 테이블별로 분리 upsert", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    await createTodo({
      userId,
      categoryId: null,
      title: "T1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    const r = await pushPending();
    expect(r.pushed).toBe(2);
    expect(state.upsertedCategories).toHaveLength(1);
    expect(state.upsertedTodos).toHaveLength(1);
  });

  it("성공 시 sync_queue 비움", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    await pushPending();
    const db = getDb();
    const remaining = await db.sync_queue.count();
    expect(remaining).toBe(0);
  });

  it("upsert 에러 시 큐 보존 + failed 카운트 증가", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    state.upsertError = "rls violation";
    const r = await pushPending();
    expect(r.failed).toBeGreaterThan(0);
    expect(r.pushed).toBe(0);

    const db = getDb();
    const remaining = await db.sync_queue.count();
    expect(remaining).toBeGreaterThan(0);
  });

  // ─── stale 큐 항목 폐기 (게스트 잔재 RLS 무한 실패 방지) ──
  it("payload.user_id가 인증된 사용자와 다르면 그 항목은 폐기하고 push 안 함", async () => {
    // mock auth는 user-a를 반환. 게스트 잔재인 다른 user_id로 큐 항목 만들기
    await createCategory({ userId: "guest-uuid-xyz", label: "옛 게스트", color: "#000" });

    const db = getDb();
    const before = await db.sync_queue.count();
    expect(before).toBe(1);

    const r = await pushPending();

    // 서버로 push 안 됨
    expect(state.upsertedCategories).toHaveLength(0);
    expect(r.pushed).toBe(0);
    expect(r.failed).toBe(0);

    // 큐에서 제거됨 (재시도 안 함)
    const after = await db.sync_queue.count();
    expect(after).toBe(0);
  });

  it("stale 항목과 정상 항목이 섞여 있으면 stale만 폐기하고 정상은 push", async () => {
    await createCategory({ userId: "guest-uuid-xyz", label: "옛 게스트", color: "#000" });
    await createCategory({ userId, label: "신규 정상", color: "#111" });

    const r = await pushPending();

    expect(r.pushed).toBe(1);
    expect(state.upsertedCategories).toHaveLength(1);
    expect(state.upsertedCategories[0].label).toBe("신규 정상");

    const db = getDb();
    expect(await db.sync_queue.count()).toBe(0);
  });
});

describe("pullChanges", () => {
  it("lastPulledAt 이후 변경분만 가져오고 머지", async () => {
    await setLastPulledAt("2026-06-28T00:00:00Z");

    const c: Category = {
      id: "c1",
      user_id: userId,
      label: "원격",
      color: "#000000",
      sort_order: 0,
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
      deleted_at: null,
    };
    state.categories.push(c);

    const r = await pullChanges(userId);
    expect(r.pulled).toBe(1);

    const db = getDb();
    const local = await db.categories.get("c1");
    expect(local?.label).toBe("원격");
  });

  it("lastPulledAt 이전 변경은 제외", async () => {
    await setLastPulledAt("2026-06-28T12:00:00Z");

    const c: Category = {
      id: "c1",
      user_id: userId,
      label: "오래된",
      color: "#000000",
      sort_order: 0,
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T11:00:00Z",
      deleted_at: null,
    };
    state.categories.push(c);

    const r = await pullChanges(userId);
    expect(r.pulled).toBe(0);
  });

  it("다른 user 데이터는 받지 않음 (eq 필터 검증)", async () => {
    const c: Category = {
      id: "c1",
      user_id: "other-user",
      label: "남의 것",
      color: "#000000",
      sort_order: 0,
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
      deleted_at: null,
    };
    state.categories.push(c);

    const r = await pullChanges(userId);
    expect(r.pulled).toBe(0);
  });

  it("LWW: 로컬 updated_at이 더 크면 로컬 유지 (원격 무시)", async () => {
    // 로컬: 더 최신
    await createCategory({ userId, label: "로컬-최신", color: "#000000" });
    const db = getDb();
    const local = (await db.categories.toArray())[0];
    // updated_at을 더 최신으로 강제
    local.updated_at = "2026-06-28T15:00:00Z";
    await db.categories.put(local);

    // 원격: 같은 id, 더 오래됨
    state.categories.push({
      ...local,
      label: "원격-오래됨",
      updated_at: "2026-06-28T10:00:00Z",
    });

    await pullChanges(userId);
    const after = await db.categories.get(local.id);
    expect(after?.label).toBe("로컬-최신");
  });

  it("LWW: 원격 updated_at이 더 크면 원격 채택", async () => {
    await createCategory({ userId, label: "로컬-오래됨", color: "#000000" });
    const db = getDb();
    const local = (await db.categories.toArray())[0];
    local.updated_at = "2026-06-28T10:00:00Z";
    await db.categories.put(local);

    state.categories.push({
      ...local,
      label: "원격-최신",
      updated_at: "2026-06-28T15:00:00Z",
    });

    await pullChanges(userId);
    const after = await db.categories.get(local.id);
    expect(after?.label).toBe("원격-최신");
  });

  it("원격 soft-delete가 더 최신이면 로컬에도 deleted_at 반영", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    const db = getDb();
    const local = (await db.categories.toArray())[0];
    local.updated_at = "2026-06-28T10:00:00Z";
    await db.categories.put(local);

    state.categories.push({
      ...local,
      updated_at: "2026-06-28T15:00:00Z",
      deleted_at: "2026-06-28T15:00:00Z",
    });

    await pullChanges(userId);
    const after = await db.categories.get(local.id);
    expect(after?.deleted_at).not.toBeNull();
  });

  it("pullChanges 후 lastPulledAt 갱신", async () => {
    const before = await getLastPulledAt();
    await pullChanges(userId);
    const after = await getLastPulledAt();
    expect(after).not.toBe(before);
    expect(after).toBeTruthy();
  });

  it("todos도 같이 머지 (categories + todos 둘 다 pulled에 카운트)", async () => {
    const remoteCat: Category = {
      id: "c1",
      user_id: userId,
      label: "X",
      color: "#000000",
      sort_order: 0,
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
      deleted_at: null,
    };
    const remoteTodo: Todo = {
      id: "t1",
      user_id: userId,
      category_id: null,
      title: "원격 할 일",
      due_date: "2026-06-28",
      completion_method: "tap",
      target_count: null,
      target_seconds: null,
      current_count: 0,
      completed_at: null,
      sort_order: 0,
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
      deleted_at: null,
    };
    state.categories.push(remoteCat);
    state.todos.push(remoteTodo);

    const r = await pullChanges(userId);
    expect(r.pulled).toBe(2);
  });
});
