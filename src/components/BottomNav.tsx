"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ListChecks, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/list", label: "할 일", icon: ListChecks },
  { href: "/settings", label: "설정", icon: Settings },
];

// 떠 있는 알약(pill) 형태의 하단 내비.
// 활성 탭은 accent-soft 배경 캡슐 + 아이콘 + 라벨이 가로로 펼쳐짐.
// 비활성 탭은 아이콘만 (공간 절약 + 시각적 강조).
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 px-5"
      style={{
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
      aria-label="하단 내비게이션"
    >
      <ul
        className="flex h-[60px] items-center justify-around rounded-xl bg-bg/90 px-2 backdrop-blur-md"
        style={{
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-md px-3 transition-all ${
                  active ? "bg-accent-soft text-accent" : "text-muted active:bg-surface-strong"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {active && <span className="text-sub font-semibold">{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
