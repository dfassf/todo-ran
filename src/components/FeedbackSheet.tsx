"use client";

import { useState } from "react";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";
import MethodTile from "./ui/MethodTile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/sync/engine";
import { logError } from "@/lib/error-log";

type Kind = "issue" | "idea" | "other";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "issue", label: "버그" },
  { value: "idea", label: "제안" },
  { value: "other", label: "기타" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

// 사용자가 문제/의견을 남기는 시트.
// todoran.feedback 테이블에 insert.
export default function FeedbackSheet({ open, onClose }: Props) {
  const [kind, setKind] = useState<Kind>("issue");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setKind("issue");
    setBody("");
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!body.trim() || submitting) return;
    if (!isSupabaseConfigured()) {
      alert("서버 연결이 없어 저장할 수 없어요.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("feedback").insert({
        user_id: userData.user?.id ?? null,
        kind,
        body: body.trim(),
        path: typeof window !== "undefined" ? window.location.pathname : null,
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : null,
      });
      if (error) {
        logError({ context: "feedback.insert", error });
        alert("전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onClose={handleClose} title="피드백 보내기">
      {done ? (
        <div className="pb-4 text-center">
          <p className="text-title">고마워요 🙏</p>
          <p className="mt-2 text-sub text-muted">잘 전달됐어요. 빨리 확인할게요.</p>
          <div className="mt-6">
            <Button fullWidth onClick={handleClose}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sub font-medium text-text-sub">종류</p>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((k) => (
                <MethodTile
                  key={k.value}
                  label={k.label}
                  selected={kind === k.value}
                  onClick={() => setKind(k.value)}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sub font-medium text-text-sub">내용</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="편하게 적어주세요. 어떤 상황이었는지 알려주시면 큰 도움이 돼요."
              className="block w-full rounded-md border border-transparent bg-surface-strong px-4 py-3 text-body text-text outline-none transition-colors placeholder:text-muted focus:border-accent focus:bg-bg"
            />
          </div>

          <div className="mt-8 flex gap-3 pb-2">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              취소
            </Button>
            <Button fullWidth onClick={submit} disabled={!body.trim() || submitting}>
              {submitting ? "전송 중…" : "보내기"}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
