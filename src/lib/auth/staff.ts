import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// 관리자(staff) 권한 판정.
//
// ─── 왜 서버 전용인가 ──────────────────────────
// 이 판정은 절대 클라이언트 번들에 들어가면 안 됨.
// (1) 판정 로직/키워드가 노출되면 관리자 라우트를 사람이 손으로 찾는 힌트가 됨
// (2) 클라이언트에서 "관리자인지" 여부를 직접 계산하는 순간, 이메일 화이트리스트
//     같은 흔적이 다시 살아날 여지가 생김
//
// "server-only" import는 서버가 아닌 곳에서 이 모듈을 import 하면 빌드 시점에 폭발시킴.
// 실수로 use client 파일에서 참조되는 걸 방어.
//
// ─── 판정 근거 ──────────────────────────────────
// DB의 todoran.has_role('admin') RPC를 호출.
// 함수 안에서 auth.uid() 기준으로 staff 테이블을 조회하므로
// 이메일 문자열은 앱 코드/DB 함수 어디에도 등장하지 않음.
//
// 관리자 명단 관리는 Supabase 대시보드에서 staff 테이블 직접 조작.

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();

  const { data: userResp } = await supabase.auth.getUser();
  if (!userResp.user) return false;

  // 이메일 확인 안 된 계정은 관리자 진입 차단.
  // (JWT에 email이 들어있어도 email_confirmed_at이 null이면 신원 확정 X)
  if (!userResp.user.email_confirmed_at) return false;

  const { data, error } = await supabase.rpc("has_role", { required_role: "admin" });
  if (error) return false;
  return data === true;
};
