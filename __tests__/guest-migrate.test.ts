import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Category, Todo } from "@/types";

interface FakeSupabaseState {
  upsertedCategories: Category[];
  upsertedTodos: Todo[];
  categoriesError: string | null;
  todosError: string | null;
}

const state: FakeSupabaseState = {
  upsertedCategories: [],
  upsertedTodos: [],
  categoriesError: null,
  todosError: null,
};

const resetState = () => {
  state.upsertedCategories = [];
  state.upsertedTodos = [];
  state.categoriesError = null;
  state.todosError = null;
};

// engine.isSupabaseConfigured() 통과시키기 위한 env
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "auth-user" } }, error: null }) },
    from: (table: string) => ({
      upsert: async (rows: unknown[]) => {
        if (table === "categories") {
          if (state.categoriesError) return { error: { message: state.categoriesError } };
          state.upsertedCategories.push(...(rows as Category[]));
          return { error: null };
        }
        if (table === "todos") {
          if (state.todosError) return { error: { message: state.todosError } };
          state.upsertedTodos.push(...(rows as Todo[]));
          return { error: null };
        }
        return { error: null };
      },
    }),
  }),
}));

// import는 모킹 후
import { getDb } from "@/lib/db/dexie";
import {
  createCategory,
  createTodo,
  getOrCreateGuestUserId,
  listCategories,
  listAllTodos,
  drainQueue,
} from "@/lib/db/repo";
import { migrateGuestData } from "@/lib/sync/guest-migrate";

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

describe("migrateGuestData", () => {
  it("성공 시: 서버에 upsert → 로컬 user_id 교체 → 큐 정리 → guestId 폐기", async () => {
    const guestId = await getOrCreateGuestUserId();
    const authId = "auth-user";

    await createCategory({ userId: guestId, label: "운동", color: "#10B981" });
    await createTodo({
      userId: guestId,
      categoryId: null,
      title: "T1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });

    const result = await migrateGuestData(authId);

    expect(result.migratedCategories).toBe(1);
    expect(result.migratedTodos).toBe(1);

    // 서버에 올라갔나
    expect(state.upsertedCategories).toHaveLength(1);
    expect(state.upsertedCategories[0].user_id).toBe(authId);
    expect(state.upsertedTodos).toHaveLength(1);
    expect(state.upsertedTodos[0].user_id).toBe(authId);

    // 로컬 user_id가 교체됐나
    expect(await listCategories(guestId)).toHaveLength(0);
    expect(await listCategories(authId)).toHaveLength(1);
    expect(await listAllTodos(authId)).toHaveLength(1);

    // 게스트 큐가 정리됐나 (stale payload 누적 방지)
    const remainingQueue = await drainQueue();
    const stalePayloads = remainingQueue.filter(
      (op) => (op.payload as { user_id: string }).user_id === guestId
    );
    expect(stalePayloads).toHaveLength(0);
  });

  it("카테고리 upsert 실패 시: 로컬 DB는 원상태 그대로 (재시도 가능)", async () => {
    const guestId = await getOrCreateGuestUserId();
    state.categoriesError = "rls violation";

    await createCategory({ userId: guestId, label: "운동", color: "#10B981" });
    await createTodo({
      userId: guestId,
      categoryId: null,
      title: "T1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });

    await expect(migrateGuestData("auth-user")).rejects.toThrow(/categories/);

    // 로컬은 여전히 guestId 그대로 → 다음에 재시도 가능
    expect(await listCategories(guestId)).toHaveLength(1);
    expect(await listCategories("auth-user")).toHaveLength(0);

    // todos는 서버에 안 올라갔어야 함 (순서: categories 먼저)
    expect(state.upsertedTodos).toHaveLength(0);
  });

  it("todos upsert 실패 시: 로컬 DB는 원상태, 다음 재시도에서 둘 다 다시 시도", async () => {
    const guestId = await getOrCreateGuestUserId();
    state.todosError = "network";

    await createCategory({ userId: guestId, label: "운동", color: "#10B981" });
    await createTodo({
      userId: guestId,
      categoryId: null,
      title: "T1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });

    await expect(migrateGuestData("auth-user")).rejects.toThrow(/todos/);

    // categories는 이미 서버에 갔지만, 로컬은 guestId 그대로
    expect(state.upsertedCategories).toHaveLength(1);
    expect(await listCategories(guestId)).toHaveLength(1);
    expect(await listCategories("auth-user")).toHaveLength(0);

    // 재시도 시 categories upsert는 idempotent (같은 id 다시 보냄 → DB는 같은 결과)
    resetState();
    state.todosError = null;
    const result = await migrateGuestData("auth-user");
    expect(result.migratedCategories).toBe(1);
    expect(result.migratedTodos).toBe(1);
  });

  it("이관 대상이 없으면 noop이지만 guestId는 폐기", async () => {
    await getOrCreateGuestUserId();
    const result = await migrateGuestData("auth-user");
    expect(result.migratedCategories).toBe(0);
    expect(result.migratedTodos).toBe(0);
    expect(state.upsertedCategories).toHaveLength(0);
  });

  it("guestId === authId면 아무것도 안 함 (자기 자신으로 이관 방지)", async () => {
    const guestId = await getOrCreateGuestUserId();
    await createCategory({ userId: guestId, label: "운동", color: "#10B981" });

    const result = await migrateGuestData(guestId);
    expect(result.migratedCategories).toBe(0);
    expect(state.upsertedCategories).toHaveLength(0);
  });
});
