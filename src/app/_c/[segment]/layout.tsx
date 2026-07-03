import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertCircle, MessageSquare } from "lucide-react";
import { isValidAdminSegment } from "@/lib/auth/admin-path";
import { isCurrentUserAdmin } from "@/lib/auth/staff";
import AdminTabs from "./AdminTabs";

// 관리자 은닉 라우트 레이아웃.
//
// 방어 순서:
//   (1) URL 세그먼트가 env와 일치하지 않으면 → notFound() (404)
//   (2) 로그인 안 됐거나 staff.admin 아니면 → notFound() (401/403이 아닌 404로 존재 은닉)
//   (3) 통과하면 페이지 렌더
//
// 리다이렉트가 아닌 404로 응답하는 이유:
// - 로그인 페이지로 리다이렉트하면 "여기 뭔가 있다"는 힌트를 주게 됨
// - 존재 자체를 감추는 게 정찰 방해에 더 유효
export default async function AdminHiddenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;

  if (!isValidAdminSegment(segment)) {
    notFound();
  }

  const ok = await isCurrentUserAdmin();
  if (!ok) {
    notFound();
  }

  const base = `/_c/${segment}`;

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

      <AdminTabs
        base={base}
        tabs={[
          { key: "errors", label: "에러", icon: <AlertCircle size={16} /> },
          { key: "feedback", label: "피드백", icon: <MessageSquare size={16} /> },
        ]}
      />

      {children}
    </div>
  );
}
