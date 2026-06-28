import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db/dexie";
import {
  getOrCreateGuestUserId,
  clearGuestUserId,
  getLastPulledAt,
  setLastPulledAt,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTodosByDate,
  listAllTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  drainQueue,
  clearQueue,
  prepareReassignedRows,
  commitReassignedRows,
  clearQueueForGuestPayloads,
  reorderTodos,
} from "@/lib/db/repo";

const wipe = async () => {
  const db = getDb();
  await db.categories.clear();
  await db.todos.clear();
  await db.sync_queue.clear();
  await db.meta.clear();
};

beforeEach(async () => {
  await wipe();
});

describe("guest user id", () => {
  it("최초 호출 시 새 UUID 생성", async () => {
    const id = await getOrCreateGuestUserId();
    expect(id).toMatch(/.+/);
  });

  it("두 번째 호출은 같은 id 반환 (멱등성)", async () => {
    const a = await getOrCreateGuestUserId();
    const b = await getOrCreateGuestUserId();
    expect(a).toBe(b);
  });

  it("clearGuestUserId 후 다시 호출하면 새 id", async () => {
    const a = await getOrCreateGuestUserId();
    await clearGuestUserId();
    const b = await getOrCreateGuestUserId();
    expect(a).not.toBe(b);
  });
});

describe("lastPulledAt", () => {
  it("초기에는 null", async () => {
    expect(await getLastPulledAt()).toBeNull();
  });

  it("setLastPulledAt 후 같은 값 반환", async () => {
    await setLastPulledAt("2026-06-28T10:00:00Z");
    expect(await getLastPulledAt()).toBe("2026-06-28T10:00:00Z");
  });

  it("덮어쓰기 가능", async () => {
    await setLastPulledAt("2026-06-28T10:00:00Z");
    await setLastPulledAt("2026-06-28T11:00:00Z");
    expect(await getLastPulledAt()).toBe("2026-06-28T11:00:00Z");
  });
});

describe("categories CRUD", () => {
  const userId = "user-a";

  it("createCategory가 sync_queue에 upsert op 적재", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    expect(cat.label).toBe("운동");
    expect(cat.color).toBe("#10B981");
    expect(cat.deleted_at).toBeNull();

    const queue = await drainQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].op).toBe("upsert");
    expect(queue[0].table).toBe("categories");
    expect(queue[0].row_id).toBe(cat.id);
  });

  it("listCategories는 sort_order 순으로 정렬", async () => {
    const a = await createCategory({ userId, label: "A", color: "#000000", sortOrder: 30 });
    const b = await createCategory({ userId, label: "B", color: "#000000", sortOrder: 10 });
    const c = await createCategory({ userId, label: "C", color: "#000000", sortOrder: 20 });

    const list = await listCategories(userId);
    expect(list.map((x) => x.id)).toEqual([b.id, c.id, a.id]);
  });

  it("listCategories는 다른 user 데이터 제외", async () => {
    await createCategory({ userId: "user-a", label: "A", color: "#000000" });
    await createCategory({ userId: "user-b", label: "B", color: "#000000" });
    const list = await listCategories("user-a");
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("A");
  });

  it("listCategories는 soft-deleted 제외", async () => {
    const a = await createCategory({ userId, label: "A", color: "#000000" });
    await deleteCategory(a.id);
    const list = await listCategories(userId);
    expect(list).toHaveLength(0);
  });

  it("updateCategory는 updated_at 갱신", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    const oldUpdatedAt = cat.updated_at;
    await new Promise((r) => setTimeout(r, 10));

    const updated = await updateCategory(cat.id, { label: "운동/스트레칭" });
    expect(updated?.label).toBe("운동/스트레칭");
    expect(updated?.updated_at).not.toBe(oldUpdatedAt);
  });

  it("deleteCategory는 deleted_at만 세팅, 실제로는 row 유지", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    await deleteCategory(cat.id);
    const db = getDb();
    const stillThere = await db.categories.get(cat.id);
    expect(stillThere).toBeDefined();
    expect(stillThere?.deleted_at).not.toBeNull();
  });

  it("deleteCategory는 sync_queue에 'delete' op 적재", async () => {
    const cat = await createCategory({ userId, label: "운동", color: "#10B981" });
    await clearQueue();
    await deleteCategory(cat.id);
    const queue = await drainQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].op).toBe("delete");
  });
});

describe("todos CRUD", () => {
  const userId = "user-a";

  it("createTodo 기본값", async () => {
    const t = await createTodo({
      userId,
      categoryId: null,
      title: "포스팅 쓰기",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    expect(t.title).toBe("포스팅 쓰기");
    expect(t.current_count).toBe(0);
    expect(t.completed_at).toBeNull();
    expect(t.deleted_at).toBeNull();
  });

  it("count 방식은 target_count 보존", async () => {
    const t = await createTodo({
      userId,
      categoryId: null,
      title: "물 5잔",
      dueDate: "2026-06-28",
      completionMethod: "count",
      targetCount: 5,
    });
    expect(t.target_count).toBe(5);
    expect(t.target_seconds).toBeNull();
  });

  it("listTodosByDate는 다른 날짜 제외", async () => {
    await createTodo({
      userId,
      categoryId: null,
      title: "오늘 1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await createTodo({
      userId,
      categoryId: null,
      title: "내일 1",
      dueDate: "2026-06-29",
      completionMethod: "tap",
    });
    const list = await listTodosByDate(userId, "2026-06-28");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("오늘 1");
  });

  it("listTodosByDate는 soft-deleted 제외", async () => {
    const t = await createTodo({
      userId,
      categoryId: null,
      title: "삭제 대상",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await deleteTodo(t.id);
    const list = await listTodosByDate(userId, "2026-06-28");
    expect(list).toHaveLength(0);
  });

  it("listAllTodos는 due_date 오름차순 정렬", async () => {
    await createTodo({
      userId,
      categoryId: null,
      title: "C",
      dueDate: "2026-06-30",
      completionMethod: "tap",
    });
    await createTodo({
      userId,
      categoryId: null,
      title: "A",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await createTodo({
      userId,
      categoryId: null,
      title: "B",
      dueDate: "2026-06-29",
      completionMethod: "tap",
    });
    const list = await listAllTodos(userId);
    expect(list.map((t) => t.title)).toEqual(["A", "B", "C"]);
  });

  it("updateTodo로 completed_at 세팅", async () => {
    const t = await createTodo({
      userId,
      categoryId: null,
      title: "탭",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    const completedAt = "2026-06-28T10:00:00Z";
    const u = await updateTodo(t.id, { completed_at: completedAt });
    expect(u?.completed_at).toBe(completedAt);
  });

  it("updateTodo는 updated_at 자동 갱신", async () => {
    const t = await createTodo({
      userId,
      categoryId: null,
      title: "탭",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await new Promise((r) => setTimeout(r, 10));
    const u = await updateTodo(t.id, { current_count: 3 });
    expect(u?.updated_at).not.toBe(t.updated_at);
  });

  it("updateTodo 존재하지 않는 id는 null", async () => {
    const result = await updateTodo("not-exist", { title: "x" });
    expect(result).toBeNull();
  });
});

describe("sync_queue", () => {
  const userId = "user-a";

  it("CRUD가 누적되면 큐도 누적", async () => {
    const cat = await createCategory({ userId, label: "A", color: "#000000" });
    await updateCategory(cat.id, { label: "A2" });
    await deleteCategory(cat.id);
    const queue = await drainQueue();
    expect(queue.length).toBe(3);
    expect(queue.map((q) => q.op)).toEqual(["upsert", "upsert", "delete"]);
  });

  it("clearQueue 후 비어있음", async () => {
    await createCategory({ userId, label: "A", color: "#000000" });
    await clearQueue();
    expect(await drainQueue()).toHaveLength(0);
  });

  it("드레인은 created_at(시간) 오름차순", async () => {
    const a = await createCategory({ userId, label: "A", color: "#000000" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createCategory({ userId, label: "B", color: "#000000" });

    const queue = await drainQueue();
    const aIdx = queue.findIndex((q) => q.row_id === a.id);
    const bIdx = queue.findIndex((q) => q.row_id === b.id);
    expect(aIdx).toBeLessThan(bIdx);
  });
});

describe("prepareReassignedRows (로컬 DB 안 건드림)", () => {
  it("user_id가 교체된 사본을 반환하지만 DB의 원본은 그대로", async () => {
    const guestId = "guest-uuid";
    const authId = "auth-uuid";

    await createCategory({ userId: guestId, label: "A", color: "#000000" });
    await createTodo({
      userId: guestId,
      categoryId: null,
      title: "T1",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });

    const { categories, todos } = await prepareReassignedRows(guestId, authId);

    expect(categories[0].user_id).toBe(authId);
    expect(todos[0].user_id).toBe(authId);

    // 로컬 DB는 여전히 guestId 그대로 (서버 upsert 실패 시 재시도 보장)
    const guestCats = await listCategories(guestId);
    const authCats = await listCategories(authId);
    expect(guestCats).toHaveLength(1);
    expect(authCats).toHaveLength(0);
  });

  it("이관 시 updated_at 갱신 (서버 LWW에서 새 user_id 데이터가 이김)", async () => {
    const guestId = "g";
    const c = await createCategory({ userId: guestId, label: "A", color: "#000000" });
    await new Promise((r) => setTimeout(r, 10));

    const { categories } = await prepareReassignedRows(guestId, "auth");
    expect(categories[0].updated_at).not.toBe(c.updated_at);
  });

  it("이관 대상 없으면 빈 배열", async () => {
    const result = await prepareReassignedRows("none", "auth");
    expect(result.categories).toEqual([]);
    expect(result.todos).toEqual([]);
  });
});

describe("commitReassignedRows (서버 성공 후 로컬 반영)", () => {
  it("주어진 행들을 로컬 DB에 일괄 반영", async () => {
    const guestId = "guest-uuid";
    const authId = "auth-uuid";

    await createCategory({ userId: guestId, label: "A", color: "#000000" });
    await createCategory({ userId: "other", label: "OTHER", color: "#000000" });

    const { categories, todos } = await prepareReassignedRows(guestId, authId);
    await commitReassignedRows(categories, todos);

    expect(await listCategories(guestId)).toHaveLength(0);
    expect(await listCategories(authId)).toHaveLength(1);
    expect(await listCategories("other")).toHaveLength(1); // 다른 사용자는 그대로
  });
});

describe("clearQueueForGuestPayloads (이관 후 stale 큐 정리)", () => {
  it("게스트 user_id 페이로드만 큐에서 제거", async () => {
    const guestId = "guest-uuid";
    const otherId = "other-user";

    // 게스트가 만든 카테고리 (sync_queue에 적재됨)
    await createCategory({ userId: guestId, label: "G1", color: "#000000" });
    await createCategory({ userId: guestId, label: "G2", color: "#000000" });

    // 다른 사용자의 큐 항목도 하나 (이건 보존돼야 함)
    await createCategory({ userId: otherId, label: "O1", color: "#000000" });

    const before = await drainQueue();
    expect(before).toHaveLength(3);

    await clearQueueForGuestPayloads(guestId);

    const after = await drainQueue();
    expect(after).toHaveLength(1);
    expect((after[0].payload as { user_id: string }).user_id).toBe(otherId);
  });

  it("게스트 페이로드가 없으면 noop", async () => {
    await createCategory({ userId: "other", label: "O", color: "#000000" });
    await clearQueueForGuestPayloads("guest-no-data");
    const queue = await drainQueue();
    expect(queue).toHaveLength(1);
  });
});

describe("reorderTodos", () => {
  const userId = "user-a";

  it("주어진 id 순서대로 sort_order 재할당 (1000, 2000, 3000...)", async () => {
    const a = await createTodo({
      userId,
      categoryId: null,
      title: "A",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    const b = await createTodo({
      userId,
      categoryId: null,
      title: "B",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    const c = await createTodo({
      userId,
      categoryId: null,
      title: "C",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });

    // C, A, B 순으로 재정렬
    await reorderTodos([c.id, a.id, b.id]);
    const list = await listTodosByDate(userId, "2026-06-28");
    expect(list.map((t) => t.title)).toEqual(["C", "A", "B"]);
    expect(list.map((t) => t.sort_order)).toEqual([1000, 2000, 3000]);
  });

  it("존재하지 않는 id가 섞여있으면 그건 무시하고 진행", async () => {
    const a = await createTodo({
      userId,
      categoryId: null,
      title: "A",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await reorderTodos([a.id, "non-existent-id"]);
    const list = await listTodosByDate(userId, "2026-06-28");
    expect(list).toHaveLength(1);
    expect(list[0].sort_order).toBe(1000);
  });

  it("재정렬도 sync_queue에 upsert로 적재", async () => {
    const a = await createTodo({
      userId,
      categoryId: null,
      title: "A",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    const b = await createTodo({
      userId,
      categoryId: null,
      title: "B",
      dueDate: "2026-06-28",
      completionMethod: "tap",
    });
    await clearQueue();

    await reorderTodos([b.id, a.id]);
    const queue = await drainQueue();
    expect(queue).toHaveLength(2);
    expect(queue.every((q) => q.op === "upsert" && q.table === "todos")).toBe(true);
  });
});
