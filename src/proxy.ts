import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ─── 관리자 라우트 초기 방어층 ─────────────────────────────
// /c/<seg> 라우트가 존재 자체를 은닉하도록 middleware 단에서 세그먼트 유효성 검사.
// 유효하지 않으면 404를 즉시 반환 → 페이지 렌더/DB 조회로 넘어가지 않음.
//
// 여기서 세그먼트를 확인하는 이유:
// - 페이지 layout에서도 재차 검사하지만 layout은 렌더 파이프라인 안쪽.
//   middleware에서 먼저 잘라내면 존재 자체를 요청 단계에서 감출 수 있음.
// - env 미설정 상태에서는 어떤 세그먼트도 유효하지 않으므로 /c/* 전체가 404.
//
// 진짜 권한 검증(staff.admin)은 layout의 isCurrentUserAdmin()이 담당.
// 여기선 "존재 은닉" 층만.
const ADMIN_PREFIX = "/c/";

const isValidAdminPath = (pathname: string): boolean => {
  if (!pathname.startsWith(ADMIN_PREFIX)) return true; // /c/* 아니면 pass
  const segment = pathname.slice(ADMIN_PREFIX.length).split("/")[0];
  const expected = process.env.ADMIN_PATH_SEGMENT;
  if (!expected || expected.length < 3) return false;
  if (!/^[a-z0-9-]+$/i.test(expected)) return false;
  return segment === expected;
};

export const proxy = async (request: NextRequest) => {
  if (!isValidAdminPath(request.nextUrl.pathname)) {
    // 401/403이 아닌 404를 돌려줘야 "여기 뭔가 있다"는 신호를 주지 않음
    return new NextResponse("Not Found", { status: 404 });
  }
  return updateSession(request);
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
