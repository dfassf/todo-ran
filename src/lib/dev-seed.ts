// 게스트 모드 첫 진입 시 자동 시드.
// 시드 버전이 바뀌면 기존 게스트 데이터를 깨끗하게 비우고 다시 시드.
// production 빌드에선 호출되지 않음.

import { getDb, META_KEYS } from "@/lib/db/dexie";
import {
  createCategory,
  createTodo,
  getOrCreateGuestUserId,
  listCategories,
  listAllTodos,
} from "@/lib/db/repo";
import { dispatchCategoryChanged, dispatchTodoChanged } from "@/lib/events";
import type { Category, CompletionMethod } from "@/types";

// 시드 변경 시 버전 올리면 게스트 데이터 초기화 후 재시드.
const SEED_VERSION = "v3";

const SEED_CATEGORIES: { label: string; color: string }[] = [
  { label: "운동", color: "#10B981" },
  { label: "공부", color: "#3B82F6" },
  { label: "집안일", color: "#F97316" },
  { label: "장보기", color: "#EC4899" },
  { label: "약복용", color: "#8B5CF6" },
];

interface SeedTodo {
  title: string;
  categoryLabel: string | null;
  dueOffsetDays: number;
  method: CompletionMethod;
  targetCount?: number;
  targetSeconds?: number;
}

// UI에 노출되는 3종(tap/count/timer)만 사용
const SEED_TODOS: SeedTodo[] = [
  { title: "물 5잔 마시기", categoryLabel: "약복용", dueOffsetDays: 0, method: "count", targetCount: 5 },
  { title: "팟캐스트 듣기", categoryLabel: "공부", dueOffsetDays: 0, method: "timer", targetSeconds: 25 * 60 },
  { title: "영양제 먹기", categoryLabel: "약복용", dueOffsetDays: 0, method: "tap" },
  { title: "이마트 주문", categoryLabel: "장보기", dueOffsetDays: 0, method: "tap" },
  { title: "보험 비교", categoryLabel: null, dueOffsetDays: -1, method: "tap" },
  { title: "책 읽기", categoryLabel: "공부", dueOffsetDays: 1, method: "timer", targetSeconds: 30 * 60 },
];

const dateWithOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// 게스트 user의 모든 데이터를 깨끗하게 비움 (시드 버전 변경 시).
const wipeGuestData = async (userId: string) => {
  const db = getDb();
  const cats = await db.categories.where("user_id").equals(userId).toArray();
  const todos = await db.todos.where("user_id").equals(userId).toArray();
  await db.categories.bulkDelete(cats.map((c) => c.id));
  await db.todos.bulkDelete(todos.map((t) => t.id));
  await db.sync_queue.clear();
};

const performSeed = async (userId: string) => {
  // 같은 label이 이미 있으면 그 id를 재사용 (중복 가드)
  const existing = await listCategories(userId);
  const existingByLabel = new Map(existing.map((c) => [c.label, c]));

  const byLabel = new Map<string, string>();
  for (let i = 0; i < SEED_CATEGORIES.length; i++) {
    const sc = SEED_CATEGORIES[i];
    const found = existingByLabel.get(sc.label);
    if (found) {
      byLabel.set(sc.label, found.id);
      continue;
    }
    const cat: Category = await createCategory({
      userId,
      label: sc.label,
      color: sc.color,
      sortOrder: i,
    });
    byLabel.set(sc.label, cat.id);
  }

  for (const st of SEED_TODOS) {
    await createTodo({
      userId,
      categoryId: st.categoryLabel ? (byLabel.get(st.categoryLabel) ?? null) : null,
      title: st.title,
      dueDate: dateWithOffset(st.dueOffsetDays),
      completionMethod: st.method,
      targetCount: st.targetCount ?? null,
      targetSeconds: st.targetSeconds ?? null,
    });
  }
};

// 앱 첫 진입 시 자동 호출.
// - 시드 안 한 게스트는 시드
// - 시드 버전이 바뀐 게스트는 데이터 wipe 후 재시드
// - 로그인 사용자거나 사용자가 직접 만든 데이터가 있고 시드 한 적 없으면 skip 마크만
export const maybeAutoSeed = async (): Promise<{ seeded: boolean; reason: string }> => {
  if (process.env.NODE_ENV === "production") return { seeded: false, reason: "production" };

  const db = getDb();
  const mark = await db.meta.get(META_KEYS.autoSeeded);
  const userId = await getOrCreateGuestUserId();

  // 이미 현재 버전으로 시드 마크가 있으면 noop
  if (mark?.value.startsWith(SEED_VERSION)) {
    return { seeded: false, reason: "already-seeded" };
  }

  // 시드 마크가 있는데 버전이 다르면 게스트 데이터 wipe (이전 버전 흔적 제거)
  if (mark) {
    await wipeGuestData(userId);
  } else {
    // 마크가 없지만 사용자가 직접 만든 데이터가 있으면 손대지 않고 skip
    const cats = await listCategories(userId);
    const todos = await listAllTodos(userId);
    if (cats.length > 0 || todos.length > 0) {
      await db.meta.put({ key: META_KEYS.autoSeeded, value: `${SEED_VERSION}:skipped` });
      return { seeded: false, reason: "user-data-exists" };
    }
  }

  await performSeed(userId);
  await db.meta.put({
    key: META_KEYS.autoSeeded,
    value: `${SEED_VERSION}:${new Date().toISOString()}`,
  });

  dispatchCategoryChanged();
  dispatchTodoChanged();
  return { seeded: true, reason: "ok" };
};
