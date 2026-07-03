"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import EmptyState from "@/components/EmptyState";
import { Check } from "lucide-react";

interface Feedback {
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

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("unresolved");

  const fetchList = () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    let query = supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter === "unresolved") {
      query = query.is("resolved_at", null);
    }
    query.then(({ data, error }) => {
      if (error) {
        console.error("[admin/feedback] fetch failed:", error);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as Feedback[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    // 서버 데이터 fetch 후 state 반영 — 외부 시스템 동기화 목적, 의도된 패턴
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [filter]);

  const markResolved = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("feedback")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      alert("실패했어요: " + error.message);
      return;
    }
    fetchList();
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

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-muted">불러오는 중…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={filter === "unresolved" ? "미확인 피드백이 없어요" : "피드백이 없어요"}
          description={filter === "unresolved" ? "모두 확인 처리됐어요." : undefined}
        />
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
                    onClick={() => markResolved(fb.id)}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-sm bg-accent-soft px-2 text-tiny font-semibold text-accent active:opacity-80"
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
