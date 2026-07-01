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

// Material You (Android 14+) Pill Navigation 스타일.
// - 화면 바닥에서 살짝 띄움 (floating)
// - 활성 탭의 "아이콘 뒤에 알약 모양 강조 캡슐" + 라벨 표시
// - 비활성 탭은 아이콘만
// - 둥근 알약 형태 바 + 부드러운 elevation
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      // 알약 바깥 여백 영역이 클릭을 흡수하지 않도록 nav는 pointer-events: none.
      // 실제 클릭을 받아야 하는 알약(ul)에만 pointer-events: auto.
      className="pointer-events-none fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 px-4"
      style={{
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
      aria-label="하단 내비게이션"
    >
      <ul
        className="pointer-events-auto flex h-[68px] items-center justify-around rounded-[28px] bg-bg px-2"
        style={{
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className="flex h-full flex-col items-center justify-center gap-1"
              >
                {/* Material You 시그니처: 활성 탭만 아이콘 뒤에 알약 캡슐 */}
                <span
                  className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-accent-soft" : ""
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.8}
                    className={active ? "text-accent" : "text-muted"}
                  />
                </span>
                <span
                  className={`text-tiny ${
                    active ? "font-bold text-accent" : "font-medium text-muted"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
