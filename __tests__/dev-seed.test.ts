import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDb, META_KEYS } from "@/lib/db/dexie";
import { getOrCreateGuestUserId, listCategories, listAllTodos } from "@/lib/db/repo";
import { maybeAutoSeed } from "@/lib/dev-seed";

const wipe = async () => {
  const db = getDb();
  await db.categories.clear();
  await db.todos.clear();
  await db.sync_queue.clear();
  await db.meta.clear();
};

beforeEach(async () => {
  await wipe();
  vi.unstubAllEnvs();
  // dev-seed는 process.env.NODE_ENV를 봄. test 환경은 이미 dev로 취급됨(production 아님)
});

describe("maybeAutoSeed", () => {
  it("첫 진입 (마크 없음, 데이터 없음) → 시드 실행", async () => {
    const result = await maybeAutoSeed();
    expect(result.seeded).toBe(true);
    expect(result.reason).toBe("ok");

    const userId = await getOrCreateGuestUserId();
    const cats = await listCategories(userId);
    const todos = await listAllTodos(userId);

    expect(cats.length).toBeGreaterThan(0);
    expect(todos.length).toBeGreaterThan(0);
  });

  it("이미 시드된 상태 (같은 버전 마크 있음) → skip", async () => {
    await maybeAutoSeed(); // 1회
    const result = await maybeAutoSeed(); // 2회
    expect(result.seeded).toBe(false);
    expect(result.reason).toBe("already-seeded");
  });

  it("사용자가 직접 만든 데이터가 있고 마크가 없으면 → skip (덮어쓰지 않음)", async () => {
    const db = getDb();
    const userId = await getOrCreateGuestUserId();
    // 사용자가 만든 카테고리 하나
    await db.categories.put({
      id: "user-cat",
      user_id: userId,
      label: "내가 만든 것",
      color: "#000000",
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    const result = await maybeAutoSeed();
    expect(result.seeded).toBe(false);
    expect(result.reason).toBe("user-data-exists");

    // 사용자 데이터는 그대로 있고, 시드로 인한 새 카테고리는 안 만들어짐
    const cats = await listCategories(userId);
    expect(cats.map((c) => c.label)).toContain("내가 만든 것");
    expect(cats).toHaveLength(1); // 시드 카테고리 안 추가
  });

  it("사용자 데이터 skip 시에도 마크는 찍힘 (다음 진입 시 재시도 방지)", async () => {
    const db = getDb();
    const userId = await getOrCreateGuestUserId();
    await db.categories.put({
      id: "user-cat",
      user_id: userId,
      label: "u",
      color: "#000",
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    await maybeAutoSeed();
    const mark = await db.meta.get(META_KEYS.autoSeeded);
    expect(mark).toBeDefined();
    expect(mark?.value).toContain("skipped");
  });

  it("시드 버전이 바뀌면 기존 데이터를 wipe하고 재시드", async () => {
    // 1회 시드 (v3로 마크됨)
    await maybeAutoSeed();

    // 마크를 옛 버전으로 조작
    const db = getDb();
    await db.meta.put({
      key: META_KEYS.autoSeeded,
      value: "v1:2026-06-28T00:00:00Z",
    });

    // 사용자가 뭔가 만들었다고 가정 — wipe로 사라져야 함
    const userId = await getOrCreateGuestUserId();
    await db.categories.put({
      id: "old-cat",
      user_id: userId,
      label: "이전 시드 잔재",
      color: "#000",
      sort_order: 999,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    const result = await maybeAutoSeed();
    expect(result.seeded).toBe(true);

    const cats = await listCategories(userId);
    // 이전 마크의 데이터는 wipe돼야 함
    expect(cats.map((c) => c.label)).not.toContain("이전 시드 잔재");
    // 새 시드 카테고리 있음
    expect(cats.length).toBeGreaterThan(0);
  });

  it("production 환경에서는 항상 noop", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await maybeAutoSeed();
    expect(result.seeded).toBe(false);
    expect(result.reason).toBe("production");

    const userId = await getOrCreateGuestUserId();
    const cats = await listCategories(userId);
    expect(cats).toHaveLength(0);
  });

  it("시드된 카테고리에 중복이 없음 (같은 label 여러 번 안 만듦)", async () => {
    // 첫 시드
    await maybeAutoSeed();

    // 마크만 지우고 카테고리는 남긴 상태에서 시드 재시도
    const db = getDb();
    await db.meta.delete(META_KEYS.autoSeeded);

    // 사용자 데이터 있음(=시드된 카테고리들)이라 skip 될 텐데,
    // 만약 skip 안 되고 다시 시드했더라도 중복 label은 안 만들어야 함.
    // performSeed의 existingByLabel 가드 검증.
    await maybeAutoSeed();

    const userId = await getOrCreateGuestUserId();
    const cats = await listCategories(userId);
    const labels = cats.map((c) => c.label);
    const uniqueLabels = new Set(labels);
    expect(labels.length).toBe(uniqueLabels.size);
  });
});
