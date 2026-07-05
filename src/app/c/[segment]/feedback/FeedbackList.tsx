"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

export interface Feedback {
  id: string;
  user_id: string | null;
  kind: "issue" | "idea" | "other";
  body: string;
  path: string | null;
  user_agent: string | null;
  created_at: string;
  resolved_at: string | null;
}

type Filter = "unresolved" | "all";

const KIND_LABEL: Record<Feedback["kind"], string> = {
  issue: "버그",
  idea: "제안",
  other: "기타",
};

const KIND_COLOR: Record<Feedback["kind"], string> = {
  issue: "bg-danger/10 text-danger",
  idea: "bg-accent-soft text-accent",
  other: "bg-surface-strong text-text-sub",
};

interface Props {
  items: Feedback[];
  filter: Filter;
  onResolve: (id: string) => Promise<{ ok: boolean; error?: string }>;
  emptyContent: React.ReactNode;
}

// 피드백 목록 표시 + 필터 토글 + 확인 처리 인터랙션.
// 필터 변경은 URL 쿼리 갱신 → 서버 재렌더.
// 확인 처리는 서버 액션 호출 후 router.refresh().
export default function FeedbackList({ items, filter, onResolve, emptyContent }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setFilter = (next: Filter) => {
    const params = new URLSearchParams(searchParams);
    if (next === "unresolved") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  };

  const handleResolve = (id: string) => {
    startTransition(async () => {
      const res = await onResolve(id);
      if (!res.ok) {
        alert("실패했어요: " + (res.error ?? "알 수 없는 오류"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mx-5 mb-4 flex gap-1 rounded-md bg-surface-strong p-1">
        <FilterTab active={filter === "unresolved"} onClick={() => setFilter("unresolved")}>
          미확인
        </FilterTab>
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          전체
        </FilterTab>
      </div>

      {items.length === 0 ? (
        emptyContent
      ) : (
        <ul className="divide-y divide-border">
          {items.map((fb) => (
            <li key={fb.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-tiny font-semibold ${KIND_COLOR[fb.kind]}`}
                    >
                      {KIND_LABEL[fb.kind]}
                    </span>
                    <span className="text-caption text-muted">{formatTime(fb.created_at)}</span>
                    {fb.resolved_at && (
                      <span className="text-tiny font-semibold text-success">확인됨</span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sub text-text">{fb.body}</p>
                  <div className="mt-2 flex gap-3 text-tiny text-muted">
                    {fb.path && <span>{fb.path}</span>}
                    {fb.user_id && (
                      <span className="truncate">user: {fb.user_id.slice(0, 8)}…</span>
                    )}
                  </div>
                </div>
                {!fb.resolved_at && (
                  <button
                    type="button"
                    onClick={() => handleResolve(fb.id)}
                    disabled={pending}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-sm bg-accent-soft px-2 text-tiny font-semibold text-accent active:opacity-80 disabled:opacity-50"
                  >
                    <Check size={14} />
                    확인
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-sm text-sub font-semibold transition-colors ${
        active ? "bg-bg text-text shadow-sm" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
