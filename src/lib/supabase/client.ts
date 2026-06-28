"use client";

import { createBrowserClient } from "@supabase/ssr";

// 공용 Supabase 프로젝트(common)를 다른 앱과 함께 쓰므로
// 우리 앱의 모든 쿼리는 'todoran' 스키마로 자동 라우팅.
// supabase.from('todos') → todoran.todos
export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "todoran" } }
  );
