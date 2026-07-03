import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// admin-path 모듈은 import 시점에 process.env를 캐시함.
// 그래서 각 테스트에서 env를 바꿔가며 검증하려면 isolate + resetModules로 새로 로드해야 함.

const loadModule = async () => {
  vi.resetModules();
  return await import("@/lib/auth/admin-path");
};

describe("admin-path 세그먼트 검증", () => {
  const ORIG = process.env.ADMIN_PATH_SEGMENT;

  beforeEach(() => {
    delete process.env.ADMIN_PATH_SEGMENT;
  });

  afterEach(() => {
    if (ORIG !== undefined) process.env.ADMIN_PATH_SEGMENT = ORIG;
    else delete process.env.ADMIN_PATH_SEGMENT;
  });

  it("env 미설정 → 어떤 세그먼트도 무효, 관리자 경로 null", async () => {
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("anything")).toBe(false);
    expect(mod.isValidAdminSegment("")).toBe(false);
    expect(mod.getAdminRoot()).toBeNull();
  });

  it("정상 세그먼트 → 일치 시 true, 불일치 시 false", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x7k9";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("x7k9")).toBe(true);
    expect(mod.isValidAdminSegment("x7k8")).toBe(false);
    expect(mod.isValidAdminSegment("X7K9")).toBe(false); // 대소문자 구분
    expect(mod.getAdminRoot()).toBe("/_c/x7k9");
  });

  it("2자 이하 세그먼트 → 무효 (엔트로피 부족)", async () => {
    process.env.ADMIN_PATH_SEGMENT = "ab";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("ab")).toBe(false);
    expect(mod.getAdminRoot()).toBeNull();
  });

  it("특수문자 포함 세그먼트 → 무효 (URL 파싱 예외 회피)", async () => {
    process.env.ADMIN_PATH_SEGMENT = "x/y/z";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("x/y/z")).toBe(false);
    expect(mod.getAdminRoot()).toBeNull();
  });

  it("공백 포함 → 무효", async () => {
    process.env.ADMIN_PATH_SEGMENT = "abc def";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("abc def")).toBe(false);
  });

  it("하이픈 포함은 허용", async () => {
    process.env.ADMIN_PATH_SEGMENT = "c-42a";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("c-42a")).toBe(true);
    expect(mod.getAdminRoot()).toBe("/_c/c-42a");
  });

  it("빈 문자열 env → 무효", async () => {
    process.env.ADMIN_PATH_SEGMENT = "";
    const mod = await loadModule();
    expect(mod.isValidAdminSegment("")).toBe(false);
    expect(mod.getAdminRoot()).toBeNull();
  });
});
