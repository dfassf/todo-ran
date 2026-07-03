import { describe, it, expect } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("isAdminEmail", () => {
  it("등록된 관리자 이메일 → true", () => {
    expect(isAdminEmail("REDACTED-EMAIL")).toBe(true);
    expect(isAdminEmail("REDACTED-EMAIL")).toBe(true);
  });

  it("등록되지 않은 이메일 → false", () => {
    expect(isAdminEmail("other@example.com")).toBe(false);
    expect(isAdminEmail("test@test.com")).toBe(false);
  });

  it("대소문자 정규화 — 대문자 이메일도 허용", () => {
    expect(isAdminEmail("DFASSF@GMAIL.COM")).toBe(true);
    expect(isAdminEmail("Dfassf@Naver.Com")).toBe(true);
  });

  it("null/undefined → false", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("빈 문자열 → false", () => {
    expect(isAdminEmail("")).toBe(false);
  });

  it("공백만 있는 문자열 → false (관리자 이메일에 없으므로)", () => {
    expect(isAdminEmail("   ")).toBe(false);
  });
});
