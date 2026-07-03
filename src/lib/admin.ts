// 관리자 접근 권한.
// 이 이메일 목록에 있는 사용자만 /admin 라우트 접근 가능.
// 별도 role 시스템 만들지 않고 단순 화이트리스트로 처리.
//
// 추가 관리자가 생기면 여기에 이메일 넣기.

const ADMIN_EMAILS = ["REDACTED-EMAIL", "REDACTED-EMAIL"];

export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
