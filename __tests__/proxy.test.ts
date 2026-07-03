import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// proxy(next middleware)의 관리자 라우트 방어 검증.
// updateSession은 실제 Supabase 미들웨어이므로 mock으로 대체하고
// isValidAdminPath 분기만 확인한다.

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => ({ __passthrough: true })),
}));

// NextResponse는 next/server에서 오지만 vitest에서 곧바로 인스턴스화가 어려워
// 최소한 status만 확인 가능한 형태로 확인한다.
const buildRequest = (pathname: string) => {
  return { nextUrl: { pathname } } as unknown as import("next/server").NextRequest;
};

describe("proxy 관리자 라우트 방어", () => {
  const ORIG = process.env.ADMIN_PATH_SEGMENT;

  beforeEach(() => {
    delete process.env.ADMIN_PATH_SEGMENT;
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIG !== undefined) process.env.ADMIN_PATH_SEGMENT = ORIG;
    else delete process.env.ADMIN_PATH_SEGMENT;
  });

  it("일반 경로는 updateSession으로 통과", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/settings"))) as { __passthrough?: boolean };
    expect(res.__passthrough).toBe(true);
  });

  it("/_c/ 경로에서 env 미설정 → 404", async () => {
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/_c/anything"))) as Response;
    expect(res.status).toBe(404);
  });

  it("/_c/ 세그먼트가 env와 일치 → updateSession으로 통과", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/_c/x7k9/errors"))) as { __passthrough?: boolean };
    expect(res.__passthrough).toBe(true);
  });

  it("/_c/ 세그먼트가 env와 다름 → 404 (엔드포인트 은닉)", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/_c/wrong"))) as Response;
    expect(res.status).toBe(404);
  });

  it("env가 너무 짧으면 통과시키지 않음 (엔트로피 부족)", async () => {
    process.env.ADMIN_PATH_SEGMENT = "ab";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/_c/ab"))) as Response;
    expect(res.status).toBe(404);
  });

  it("루트 /_c 자체(뒤에 세그먼트 없음)도 404", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/_c/"))) as Response;
    expect(res.status).toBe(404);
  });

  it("/admin 등 옛 관리자 경로는 이제 존재하지 않음 → 일반 미들웨어 통과 후 Next 404", async () => {
    // proxy 단에서 /admin은 특별 취급 안 함 (라우트 파일이 없으면 Next.js가 자연스레 404 반환)
    // 여기서는 proxy가 이걸 차단하지 않고 그냥 통과시키는지 확인
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const { proxy } = await import("@/proxy");
    const res = (await proxy(buildRequest("/admin"))) as { __passthrough?: boolean };
    expect(res.__passthrough).toBe(true);
  });
});
