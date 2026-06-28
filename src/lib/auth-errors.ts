// Supabase Auth의 영어 raw 에러 메시지/코드를 사용자 친화적인 한국어로 매핑.
//
// Supabase는 에러 객체에 code(우선)와 message를 모두 담아준다.
// 새 버전(2024+)은 code 기반이 표준. 옛 메시지 기반은 fallback.

interface AuthLikeError {
  code?: string;
  message?: string;
}

// 모드에 따라 같은 코드라도 다른 안내가 더 적절한 경우가 있음
// (예: "이메일 또는 비밀번호가 달라요" vs "이미 가입된 이메일이에요")
export type AuthMode = "login" | "signup";

export const translateAuthError = (
  err: AuthLikeError | null | undefined,
  mode: AuthMode
): string => {
  if (!err) return "알 수 없는 오류가 일어났어요. 잠시 후 다시 시도해 주세요.";

  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();

  // 로그인 실패 — 이메일/비번 불일치
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    if (mode === "login") {
      return "이메일 또는 비밀번호가 맞지 않아요. 처음 오신 거면 위에서 ‘회원가입’을 눌러 주세요.";
    }
    return "이메일 또는 비밀번호를 다시 확인해 주세요.";
  }

  // 이미 가입된 이메일
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("user already")
  ) {
    return "이미 가입된 이메일이에요. 위에서 ‘로그인’을 눌러 주세요.";
  }

  // 이메일 확인 안 됨
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "이메일 확인이 필요해요. 받은 메일함을 확인해 주세요.";
  }

  // 비밀번호 너무 짧음
  if (
    code === "weak_password" ||
    msg.includes("password should be at least") ||
    msg.includes("weak password")
  ) {
    return "비밀번호가 너무 짧아요. 6자 이상으로 만들어 주세요.";
  }

  // 잘못된 이메일 형식
  if (code === "validation_failed" || msg.includes("invalid email")) {
    return "이메일 주소 형식이 올바르지 않아요.";
  }

  // 요청 과다
  if (code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return "너무 자주 시도하셨어요. 잠시 후 다시 시도해 주세요.";
  }

  // 네트워크
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "인터넷 연결을 확인해 주세요.";
  }

  // 그 외 — 짧고 모호한 안내 (raw 메시지는 노출 안 함)
  return mode === "login"
    ? "로그인에 실패했어요. 잠시 후 다시 시도해 주세요."
    : "회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.";
};
