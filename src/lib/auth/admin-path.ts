import "server-only";

// 관리자 라우트 은닉 세그먼트.
//
// ─── 왜 env로 관리하는가 ──────────────────────────
// /admin은 봇 워드리스트 최상단이라 사람 손을 완전히 못 막아도 봇 스캔은 그대로 노출됨.
// /control, /console도 워드리스트에 있어서 사실상 동일.
// 예측 불가능한 세그먼트(예: /_c/x7k9)로 두면:
//   (1) 봇 워드리스트 매칭 확률이 급감 → 스캔 노이즈 감소
//   (2) 화면 훔쳐본 사람도 "관리 화면"임을 즉시 알아채기 어려움
//   (3) 세그먼트 유출 시 .env + Vercel env 갱신만으로 즉시 교체 (재배포 1분)
//
// 근본 방어는 여전히 staff DB 권한(has_role)임. 은닉은 정찰 방해용 얇은 층.
//
// ─── 왜 언더스코어 prefix인가 ─────────────────────
// _c는 언더스코어 prefix라 관습적으로 "내부용" 신호 → 봇/크롤러가 잘 안 찌름.
// Next.js에서 _ prefix 폴더도 그냥 라우트로 잡히긴 함 (private 폴더 규칙은 __ 두 개짜리).

const RAW = process.env.ADMIN_PATH_SEGMENT;

// 서버 부팅 시점에 잘못된 값이면 즉시 발견되도록 캐싱 + 검증.
// - 3자 미만은 사실상 무의미 (랜덤성 부족)
// - 영숫자+하이픈만 허용 (URL 파싱 예외 회피)
const validate = (v: string | undefined): string | null => {
  if (!v) return null;
  if (v.length < 3) return null;
  if (!/^[a-z0-9-]+$/i.test(v)) return null;
  return v;
};

const CACHED = validate(RAW);

export const isValidAdminSegment = (segment: string): boolean => {
  if (!CACHED) return false;
  return segment === CACHED;
};

// 서버에서 관리자 링크를 구성할 때 사용. env 미설정이면 null 반환.
export const getAdminRoot = (): string | null => {
  if (!CACHED) return null;
  return `/_c/${CACHED}`;
};
