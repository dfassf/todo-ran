"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";

// 단순히 Context에서 user, loading만 읽어옴. 부작용 없음.
// onAuthStateChange 구독과 게스트 이관은 AuthProvider가 단 한 번만 처리.
export const useAuth = () => useAuthContext();

export const signInWithPassword = async (email: string, password: string) => {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithPassword = async (email: string, password: string) => {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  const supabase = createSupabaseBrowserClient();
  return supabase.auth.signOut();
};
