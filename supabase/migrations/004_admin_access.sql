-- 004_admin_access.sql
-- 관리자 이메일이 error_logs / feedback 전체를 조회 + feedback 업데이트 가능하게.
--
-- 클라이언트의 화이트리스트(src/lib/admin.ts)와 DB 정책 둘 다 관리자를 알아야 하는데
-- DB 쪽에선 auth.jwt() → email 로 직접 확인.
--
-- 관리자 이메일이 늘어나면 이 함수만 수정하면 됨.

create or replace function todoran.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in ('REDACTED-EMAIL', 'REDACTED-EMAIL'),
    false
  );
$$;

-- ─── error_logs: 관리자면 전체 조회 가능 ─────────────
drop policy if exists "admin can read all error logs" on todoran.error_logs;
create policy "admin can read all error logs" on todoran.error_logs
  for select
  using (todoran.is_admin());

-- ─── feedback: 관리자면 전체 조회 + 업데이트(resolved_at) 가능 ─────────────
drop policy if exists "admin can read all feedback" on todoran.feedback;
create policy "admin can read all feedback" on todoran.feedback
  for select
  using (todoran.is_admin());

drop policy if exists "admin can update feedback" on todoran.feedback;
create policy "admin can update feedback" on todoran.feedback
  for update
  using (todoran.is_admin())
  with check (todoran.is_admin());
