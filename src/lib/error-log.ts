import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/sync/engine";

interface ErrorLogInput {
  context: string; // 예: "sync.pull", "auth.signin"
  error: unknown; // Error 인스턴스 또는 Supabase 에러 객체
}

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
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert({
      user_id: userData.user?.id ?? null,
      context,
      message,
      detail: detail as object,
      user_agent: window.navigator.userAgent,
      path: window.location.pathname,
    });
  } catch {
    // 로깅 자체가 실패해도 앱은 계속 동작
  }
};
