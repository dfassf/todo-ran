import { createSupabaseServerClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import FeedbackList, { type Feedback } from "./FeedbackList";
import { markFeedbackResolved } from "./actions";

// 피드백 목록.
// 조회는 서버 컴포넌트, resolved 처리는 서버 액션.
// searchParams.filter로 미확인/전체 토글.
export const dynamic = "force-dynamic";

type Filter = "unresolved" | "all";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: Filter }>;
}) {
  const { filter = "unresolved" } = await searchParams;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "unresolved") {
    query = query.is("resolved_at", null);
  }

  const { data, error } = await query;
  if (error) {
    return <div className="px-5 py-6 text-sub text-danger">불러오기 실패: {error.message}</div>;
  }

  const items = (data ?? []) as Feedback[];

  return (
    <FeedbackList
      items={items}
      filter={filter}
      onResolve={markFeedbackResolved}
      emptyContent={
        <EmptyState
          title={filter === "unresolved" ? "미확인 피드백이 없어요" : "피드백이 없어요"}
          description={filter === "unresolved" ? "모두 확인 처리됐어요." : undefined}
        />
      }
    />
  );
}
