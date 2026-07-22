import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/sync/engine";

interface ErrorLogInput {
  context: string; // 예: "sync.pull", "auth.signin"
  error: unknown; // Error 인스턴스 또는 Supabase 에러 객체
}

// DB CHECK 제약보다 살짝 작게 잘라서 insert 실패 방지.
// 006_hardening.sql: context 200 / message 2000 / detail 10000 / user_agent 500 / path 500
const truncate = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s);

// detail은 jsonb라 pg_column_size 기준이라 정확한 상한 계산이 어려움.
// stack trace가 대부분의 크기를 차지하니 stack만 문자 단위로 잘라 상한 근사.
const boundDetail = (detail: unknown): unknown => {
  if (detail && typeof detail === "object" && "stack" in detail) {
    const d = detail as { stack?: unknown };
    if (typeof d.stack === "string" && d.stack.length > 5000) {
      return { ...detail, stack: d.stack.slice(0, 5000) + "…(truncated)" };
    }
  }
  return detail;
};

// 에러를 콘솔 + Supabase todoran.error_logs 테이블에 함께 기록.
// 실패해도 앱을 절대 깨뜨리지 않도록 try/catch로 완전히 삼킴.
export const logError = async ({ context, error }: ErrorLogInput): Promise<void> => {
  // Supabase 에러는 { message, code, details, hint } 순수 객체
  const detail =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  // 1) 콘솔에 먼저
  console.error(`[${context}]`, message, detail);

  // 2) 서버에 기록 (미설정이거나 실패해도 조용히)
  if (!isSupabaseConfigured() || typeof window === "undefined") return;
  try {
    const supabase = createSupabaseBrowserClient();
    // getUser 실패해도 로그 자체는 남기는 게 목적 (익명 로그로라도 남겨야 원인 파악 가능).
    // 실패 원인은 detail 에 병기해서 나중에 조회할 수 있게.
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    const enrichedDetail = userErr
      ? { ...(boundDetail(detail) as object), _getUserError: userErr.message }
      : (boundDetail(detail) as object);
    await supabase.from("error_logs").insert({
      user_id: userId,
      context: truncate(context, 190),
      message: truncate(message, 1900),
      detail: enrichedDetail,
      user_agent: truncate(window.navigator.userAgent, 490),
      path: truncate(window.location.pathname, 490),
    });
  } catch {
    // 로깅 자체가 실패해도 앱은 계속 동작
  }
};
