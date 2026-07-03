import { describe, it, expect, beforeEach, vi } from "vitest";

// 콘솔 & Supabase 호출 추적용 mock 상태
interface State {
  inserted: unknown[];
  insertError: string | null;
  consoleLogs: unknown[][];
  supabaseThrow: boolean;
}

const state: State = {
  inserted: [],
  insertError: null,
  consoleLogs: [],
  supabaseThrow: false,
};

const resetState = () => {
  state.inserted = [];
  state.insertError = null;
  state.consoleLogs = [];
  state.supabaseThrow = false;
};

// env를 실제 값처럼 설정 (isSupabaseConfigured 통과)
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => {
    if (state.supabaseThrow) throw new Error("client init failed");
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }),
      },
      from: () => ({
        insert: async (row: unknown) => {
          if (state.insertError) return { error: { message: state.insertError } };
          state.inserted.push(row);
          return { error: null };
        },
      }),
    };
  },
}));

import { logError } from "@/lib/error-log";

beforeEach(() => {
  resetState();
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    state.consoleLogs.push(args);
  });
});

describe("logError", () => {
  it("Error 인스턴스 — name/message/stack을 detail로 저장", async () => {
    const err = new Error("something broke");
    await logError({ context: "test.err", error: err });

    expect(state.consoleLogs).toHaveLength(1);
    expect(state.inserted).toHaveLength(1);
    const row = state.inserted[0] as {
      context: string;
      message: string;
      detail: { message?: string; name?: string };
    };
    expect(row.context).toBe("test.err");
    expect(row.message).toBe("something broke");
    expect(row.detail.message).toBe("something broke");
    expect(row.detail.name).toBe("Error");
  });

  it("Supabase 스타일 에러 객체 ({message, code, ...}) — message 추출 후 저장", async () => {
    const err = { message: "rls violation", code: "42501", details: "policy check failed" };
    await logError({ context: "sync.push", error: err });

    const row = state.inserted[0] as { message: string; detail: unknown };
    expect(row.message).toBe("rls violation");
    expect(row.detail).toEqual(err);
  });

  it("문자열 에러 — 그대로 message", async () => {
    await logError({ context: "misc", error: "raw string error" });
    const row = state.inserted[0] as { message: string };
    expect(row.message).toBe("raw string error");
  });

  it("null/undefined 에러 — 크래시 없이 처리", async () => {
    await expect(logError({ context: "nullish", error: null })).resolves.not.toThrow();
    await expect(logError({ context: "nullish", error: undefined })).resolves.not.toThrow();
  });

  it("insert 실패 시에도 앱 안 죽음 (try/catch 삼킴)", async () => {
    state.insertError = "network down";
    await expect(logError({ context: "test", error: new Error("boom") })).resolves.not.toThrow();
  });

  it("Supabase 클라이언트 자체가 throw해도 앱 안 죽음", async () => {
    state.supabaseThrow = true;
    await expect(logError({ context: "test", error: new Error("boom") })).resolves.not.toThrow();
  });

  it("모든 케이스에서 console.error는 최소 1번 호출 (개발자에게는 보임)", async () => {
    await logError({ context: "test", error: new Error("x") });
    expect(state.consoleLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("payload에 user_id 포함 (Supabase auth.getUser 결과)", async () => {
    await logError({ context: "test", error: new Error("x") });
    const row = state.inserted[0] as { user_id: string | null };
    expect(row.user_id).toBe("user-a");
  });
});

describe("logError — Supabase 미설정", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  it("URL이 placeholder면 서버 저장 시도 안 함 (console만)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    // 모듈 재import 필요 — isSupabaseConfigured는 호출 시점 env를 봄
    const { logError: freshLog } = await import("@/lib/error-log");
    await freshLog({ context: "test", error: new Error("x") });

    expect(state.inserted).toHaveLength(0);
    expect(state.consoleLogs.length).toBeGreaterThanOrEqual(1);

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });
});
