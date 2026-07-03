"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/lib/admin";
import { AlertCircle, MessageSquare, ChevronLeft } from "lucide-react";

// 관리자 전용 레이아웃.
// - 로그인 안 됨 → /login으로
// - 로그인은 됐지만 관리자 이메일 아님 → 홈으로
// - 관리자면 서브탭(에러/피드백) + 본문 렌더
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdminEmail(user.email)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || !isAdminEmail(user.email)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted">확인 중…</div>;
  }

  return (
    <div>
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 -ml-2 items-center justify-center rounded-sm text-text-sub active:bg-surface-strong"
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-title">관리자</h1>
      </header>

      <nav className="mx-5 mb-4 flex gap-1 rounded-md bg-surface-strong p-1">
        <AdminTab href="/admin/errors" active={pathname.startsWith("/admin/errors")}>
          <AlertCircle size={16} />
          에러
        </AdminTab>
        <AdminTab href="/admin/feedback" active={pathname.startsWith("/admin/feedback")}>
          <MessageSquare size={16} />
          피드백
        </AdminTab>
      </nav>

      {children}
    </div>
  );
}

function AdminTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm text-sub font-semibold transition-colors ${
        active ? "bg-bg text-text shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}
