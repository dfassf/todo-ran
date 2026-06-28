import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  prepareReassignedRows,
  commitReassignedRows,
  clearQueueForGuestPayloads,
  clearGuestUserId,
  getOrCreateGuestUserId,
} from "@/lib/db/repo";

// 게스트 → 인증 사용자 데이터 이관.
//
// 순서가 중요함:
//   1. 메모리에서만 user_id 교체된 사본을 만든다 (DB 안 건드림)
//   2. 서버에 categories 먼저 upsert (todos가 category_id 참조하므로)
//   3. todos upsert
//   4. 둘 다 성공한 경우에만 로컬 DB를 새 user_id로 업데이트
//   5. 게스트 id로 적재됐던 stale sync_queue 항목 제거
//   6. guestUserId 폐기
//
// 중간에 실패하면 로컬은 원상태 그대로 → 다음 로그인/sync 때 자연 재시도.
export const migrateGuestData = async (
  authUserId: string
): Promise<{ migratedCategories: number; migratedTodos: number }> => {
  const guestId = await getOrCreateGuestUserId();
  if (guestId === authUserId) {
    return { migratedCategories: 0, migratedTodos: 0 };
  }

  // 1. 사본 만들기 (로컬 DB는 아직 건드리지 않음)
  const { categories, todos } = await prepareReassignedRows(guestId, authUserId);

  if (categories.length === 0 && todos.length === 0) {
    await clearGuestUserId();
    return { migratedCategories: 0, migratedTodos: 0 };
  }

  // 2-3. 서버 먼저. 실패 시 throw → 로컬 DB는 그대로
  const supabase = createSupabaseBrowserClient();

  if (categories.length > 0) {
    const { error } = await supabase.from("categories").upsert(categories);
    if (error) {
      throw new Error(`게스트 이관 실패 (categories): ${error.message}`);
    }
  }

  if (todos.length > 0) {
    const { error } = await supabase.from("todos").upsert(todos);
    if (error) {
      throw new Error(`게스트 이관 실패 (todos): ${error.message}`);
    }
  }

  // 4. 서버 성공 — 이제 로컬 commit
  await commitReassignedRows(categories, todos);

  // 5. 게스트 payload 큐 정리 (RLS 실패 누적 방지)
  await clearQueueForGuestPayloads(guestId);

  // 6. 게스트 id 폐기
  await clearGuestUserId();

  return {
    migratedCategories: categories.length,
    migratedTodos: todos.length,
  };
};
