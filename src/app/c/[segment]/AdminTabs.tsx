"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// 관리자 하위 탭. base는 부모 layout에서 이미 검증된 은닉 경로.
export default function AdminTabs({ base, tabs }: { base: string; tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav className="mx-5 mb-4 flex gap-1 rounded-md bg-surface-strong p-1">
      {tabs.map((t) => {
        const href = `${base}/${t.key}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={t.key}
            href={href}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm text-sub font-semibold transition-colors ${
              active ? "bg-bg text-text shadow-sm" : "text-muted"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
