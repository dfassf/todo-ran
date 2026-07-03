import { describe, it, expect, beforeEach, vi } from "vitest";

// isCurrentUserAdmin은 (1) 로그인 여부 (2) 이메일 확인 (3) has_role RPC 결과 3중 검증.
// 각 분기가 실제로 필터링되는지 확인.

const makeSupabaseMock = (opts: {
  user?: { id: string; email_confirmed_at: string | null } | null;
  hasRoleData?: boolean | null;
  hasRoleError?: { message: string } | null;
}) => ({
  auth: {
    getUser: vi.fn(async () => ({ data: { user: opts.user ?? null }, error: null })),
  },
  rpc: vi.fn(async () => ({
    data: opts.hasRoleData ?? null,
    error: opts.hasRoleError ?? null,
  })),
});

const load = async (mock: ReturnType<typeof makeSupabaseMock>) => {
  vi.resetModules();
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: async () => mock,
  }));
  return await import("@/lib/auth/staff");
};

describe("isCurrentUserAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("로그인 안 됨 → false, RPC 호출 안 함", async () => {
    const mock = makeSupabaseMock({ user: null });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("이메일 미확인 상태 → false, RPC 호출 안 함 (신원 미확정)", async () => {
    const mock = makeSupabaseMock({
      user: { id: "u1", email_confirmed_at: null },
    });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("이메일 확인됐지만 staff 아님 → false", async () => {
    const mock = makeSupabaseMock({
      user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" },
      hasRoleData: false,
    });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(mock.rpc).toHaveBeenCalledWith("has_role", { required_role: "admin" });
  });

  it("이메일 확인됐고 staff.admin → true", async () => {
    const mock = makeSupabaseMock({
      user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" },
      hasRoleData: true,
    });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(true);
  });

  it("RPC 에러 → false (권한 판정 실패는 거부)", async () => {
    const mock = makeSupabaseMock({
      user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" },
      hasRoleData: null,
      hasRoleError: { message: "network" },
    });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(false);
  });

  it("RPC 결과가 null → false (true만 통과)", async () => {
    const mock = makeSupabaseMock({
      user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00Z" },
      hasRoleData: null,
    });
    const { isCurrentUserAdmin } = await load(mock);
    expect(await isCurrentUserAdmin()).toBe(false);
  });
});
