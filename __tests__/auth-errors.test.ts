import { describe, it, expect } from "vitest";
import { translateAuthError } from "@/lib/auth-errors";

describe("translateAuthError", () => {
  describe("invalid_credentials", () => {
    it("로그인 모드에서는 회원가입 안내까지 포함", () => {
      const msg = translateAuthError({ code: "invalid_credentials" }, "login");
      expect(msg).toContain("이메일 또는 비밀번호");
      expect(msg).toContain("회원가입");
    });

    it("회원가입 모드에서는 단순 안내", () => {
      const msg = translateAuthError({ code: "invalid_credentials" }, "signup");
      expect(msg).toContain("이메일 또는 비밀번호");
      expect(msg).not.toContain("회원가입");
    });

    it("code 없이 message 'Invalid login credentials'만 와도 매핑", () => {
      const msg = translateAuthError(
        { message: "Invalid login credentials" },
        "login"
      );
      expect(msg).toContain("이메일 또는 비밀번호");
    });
  });

  describe("이미 가입된 이메일", () => {
    it("user_already_exists 코드", () => {
      const msg = translateAuthError({ code: "user_already_exists" }, "signup");
      expect(msg).toContain("이미 가입");
      expect(msg).toContain("로그인");
    });

    it("'already registered' 메시지 fallback", () => {
      const msg = translateAuthError(
        { message: "User already registered" },
        "signup"
      );
      expect(msg).toContain("이미 가입");
    });
  });

  describe("이메일 미확인", () => {
    it("email_not_confirmed 코드", () => {
      const msg = translateAuthError({ code: "email_not_confirmed" }, "login");
      expect(msg).toContain("이메일 확인");
    });
  });

  describe("약한 비밀번호", () => {
    it("weak_password 코드", () => {
      const msg = translateAuthError({ code: "weak_password" }, "signup");
      expect(msg).toContain("비밀번호");
      expect(msg).toContain("6자");
    });

    it("'should be at least' 메시지 fallback", () => {
      const msg = translateAuthError(
        { message: "Password should be at least 6 characters" },
        "signup"
      );
      expect(msg).toContain("비밀번호");
    });
  });

  describe("기타", () => {
    it("rate limit", () => {
      const msg = translateAuthError({ code: "over_request_rate_limit" }, "login");
      expect(msg).toContain("잠시");
    });

    it("network 실패", () => {
      const msg = translateAuthError({ message: "Failed to fetch" }, "login");
      expect(msg).toContain("인터넷");
    });

    it("알 수 없는 에러 — raw 메시지 노출 안 함", () => {
      const raw = "internal server error: foo bar baz";
      const msg = translateAuthError({ message: raw }, "login");
      expect(msg).not.toContain("foo");
      expect(msg).not.toContain("internal");
      expect(msg).toContain("로그인에 실패");
    });

    it("err가 null이면 안전한 기본 메시지", () => {
      const msg = translateAuthError(null, "login");
      expect(msg).toContain("알 수 없는");
    });

    it("err가 undefined여도 안전", () => {
      const msg = translateAuthError(undefined, "signup");
      expect(msg).toContain("알 수 없는");
    });
  });
});
