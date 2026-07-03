import { createSupabaseServerClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import ErrorLogList, { type ErrorLog } from "./ErrorLogList";

// 에러 로그 목록.
// 데이터는 서버 컴포넌트에서 조회 → 조회 자체가 클라 번들에 안 들어감.
// 접근한 시점에 이미 layout에서 admin 검증 통과했으므로 여기선 그냥 조회.
export const dynamic = "force-dynamic";

export default async function AdminErrorsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return <div className="px-5 py-6 text-sub text-danger">불러오기 실패: {error.message}</div>;
  }

  const logs = (data ?? []) as ErrorLog[];

  if (logs.length === 0) {
    return (
      <EmptyState
        title="에러 로그가 없어요"
        description="아직 아무 문제 없이 잘 돌아가고 있어요."
      />
    );
  }

  return <ErrorLogList logs={logs} />;
}
