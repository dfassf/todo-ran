import { describe, it, expect, afterEach } from "vitest";
import { isSupabaseConfigured } from "@/lib/sync/engine";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("isSupabaseConfigured", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it("URL과 key 둘 다 실제 값이면 true", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJ...";
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("URL에 placeholder 들어있으면 false", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJ...";
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("key에 placeholder 들어있으면 false", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "placeholder";
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("URL이 비어있으면 false", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJ...";
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("key가 비어있으면 false", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(isSupabaseConfigured()).toBe(false);
  });
});
