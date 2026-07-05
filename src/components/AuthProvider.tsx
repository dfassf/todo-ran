"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { migrateGuestData } from "@/lib/sync/guest-migrate";
import { isSupabaseConfigured } from "@/lib/sync/engine";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

// ─── 왜 이렇게 복잡하게 초기화 하는가 ─────────────────────────
// 이전 구현은 getUser() 한 번 실패 = 즉시 로그아웃 처리였음.
// 그러다 보니 아래 상황들이 전부 "데이터 사라짐 + 로그아웃" 증상으로 이어졌음:
//   - Supabase 서버 순간 5xx / 지연
//   - iOS 사파리가 백그라운드에서 복귀할 때 첫 요청 abort
//   - 오프라인 상태로 앱을 여는 경우
//
// 새 구성 요지:
//   1) getSession() (로컬만 확인, 네트워크 X) → 있으면 즉시 user 세팅
//   2) getUser() (서버 검증) → 실패해도 3회까지 지수 백오프 재시도
//   3) 재시도 다 실패해도 로컬 세션은 유지 (진짜 로그아웃은 SIGNED_OUT 이벤트로만 판정)
//   4) onAuthStateChange의 SIGNED_OUT이 유일한 명시적 로그아웃 트리거
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // placeholder env. 로그인 비활성, 게스트 모드만 동작.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // 1) 로컬 세션 즉시 확인. 네트워크 안 타므로 오프라인이어도 성공.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      }
    });

    // 2) 서버 검증. 실패해도 지수 백오프로 3회까지 재시도.
    //    최종 실패해도 user는 건드리지 않음 (로컬 세션 신뢰).
    const verifyUser = async (attempt = 0): Promise<void> => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error) throw error;
        setUser(data.user);
        setLoading(false);
      } catch {
        if (!mounted) return;
        if (attempt < 3) {
          // 1초 → 3초 → 9초
          const delay = Math.pow(3, attempt) * 1000;
          retryTimer = setTimeout(() => verifyUser(attempt + 1), delay);
        } else {
          // 3회 다 실패했지만 로컬 세션이 있으면 그대로 유지.
          // 진짜 세션 만료는 다음 API 호출의 401로 자연스레 드러남.
          setLoading(false);
          console.warn("[auth] getUser 재시도 3회 실패, 로컬 세션 유지");
        }
      }
    };
    verifyUser();

    // 3) 명시적 SIGNED_OUT 이벤트만 로그아웃으로 판정.
    //    네트워크/일시 오류로 인한 오탐 방지.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED 등
      if (session?.user) setUser(session.user);
      if (event === "SIGNED_IN" && session?.user) {
        migrateGuestData(session.user.id).catch((e) => console.error("[migrate] failed:", e));
      }
    });

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuthContext = (): AuthContextValue => useContext(AuthContext);
