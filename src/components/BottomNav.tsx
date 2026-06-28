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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 border-t border-border bg-bg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-[64px] items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-tiny font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
