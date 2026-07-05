"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface ErrorLog {
  id: string;
  user_id: string | null;
  context: string;
  message: string;
  detail: unknown;
  user_agent: string | null;
  path: string | null;
  created_at: string;
}

// 에러 로그 리스트 렌더 + 펼치기 인터랙션.
// 데이터 fetch는 서버 컴포넌트가 하고 여기서는 표시만.
export default function ErrorLogList({ logs }: { logs: ErrorLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-border">
      {logs.map((log) => {
        const expanded = expandedId === log.id;
        return (
          <li key={log.id}>
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : log.id)}
              className="flex w-full items-start gap-2 px-5 py-3 text-left active:bg-surface"
            >
              <span className="mt-0.5 shrink-0 text-muted">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="rounded-sm bg-danger/10 px-2 py-0.5 text-tiny font-semibold text-danger">
                    {log.context}
                  </span>
                  <span className="text-caption text-muted">{formatTime(log.created_at)}</span>
                </span>
                <p className="mt-1 truncate text-sub text-text">{log.message}</p>
              </span>
            </button>

            {expanded && (
              <div className="border-t border-border bg-surface px-5 py-3 text-caption text-text-sub">
                <DetailRow label="user_id" value={log.user_id ?? "(익명)"} />
                <DetailRow label="path" value={log.path ?? "-"} />
                <DetailRow label="user_agent" value={log.user_agent ?? "-"} />
                <div className="mt-2">
                  <p className="mb-1 text-tiny font-semibold text-muted">detail</p>
                  <pre className="max-h-64 overflow-auto rounded-sm bg-bg p-2 text-tiny">
                    {JSON.stringify(log.detail, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 flex items-baseline gap-2">
      <span className="w-20 shrink-0 text-tiny font-semibold text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
    </div>
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
