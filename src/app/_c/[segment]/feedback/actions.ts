"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/auth/staff";

// 피드백 확인 처리 (resolved_at 세팅).
//
// ─── 왜 여기서도 관리자 검증을 다시 하는가 ─────────────
// 페이지 layout에서 이미 검증했지만, 서버 액션은 URL로 보호되지 않음.
// 누군가 form 요청을 직접 만들어 액션 엔드포인트를 두드릴 수 있으므로
// 각 액션마다 독립적으로 권한 재확인해야 안전.
//
// RLS도 has_role('admin') 검사를 하지만, 앱 레벨에서도 조기 차단해서
// 실패 응답을 명확히.
export const markFeedbackResolved = async (
  id: string
): Promise<{ ok: boolean; error?: string }> => {
  const ok = await isCurrentUserAdmin();
  if (!ok) return { ok: false, error: "권한 없음" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("feedback")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  // 목록 재렌더
  revalidatePath("/_c/[segment]/feedback", "page");
  return { ok: true };
};
