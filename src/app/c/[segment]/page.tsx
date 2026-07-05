import { redirect } from "next/navigation";

// 관리자 홈 → 에러 탭으로 리다이렉트.
// (여기까지 왔다는 건 layout에서 권한 검증 통과했다는 뜻)
export default async function AdminHiddenIndex({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  redirect(`/c/${segment}/errors`);
}
