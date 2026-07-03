-- 005_staff_roles.sql
-- 관리자 판정을 이메일 하드코드에서 역할(role) 기반으로 전환.
--
-- ─── 왜 바꾸는가 ──────────────────────────────────────────
-- 004에서 auth.jwt() → email 비교로 관리자를 판정했음.
-- 문제:
--   (1) 이메일 문자열이 SQL 함수 안에 박혀서 리포에 노출됨 (public repo)
--   (2) 관리자 추가/삭제 시 마이그레이션 새로 만들어야 함
--   (3) 이메일은 "신원(identity)"이지 "권한(authorization)"의 근거가 아님
--   (4) 이메일 확인 안 된 계정도 관리자로 뚫림 (email_confirmed_at 체크 없음)
--
-- ─── 왜 role enum + staff 테이블인가 ─────────────────────
-- 대안 비교:
--   (a) is_admin() boolean 단일 함수:
--       원자폭탄 스위치. "관리자면 다 됨"이라 세분화 불가.
--   (b) can_read_errors / can_manage_feedback 같은 boolean 컬럼:
--       권한 늘 때마다 ALTER TABLE. 스키마 뻣뻣해짐.
--   (c) role text + check 제약 + has_role() 함수  ← 채택
--       역할 추가는 check 값만 확장. 함수 하나로 통일.
--       현재 이 앱 사용자 유형이 (일반/관리자) 2가지뿐이라 딱 맞음.
--
-- ─── 실행 순서 ─────────────────────────────────────────
-- 이 파일이 004의 is_admin() 및 관련 정책을 drop 하고 새 구조로 대체함.
-- 004는 아직 실행 안 됐어도 이 파일만 실행하면 정상 동작 (drop if exists).

-- ─── 004 흔적 제거 ─────────────────────────────────────
drop policy if exists "admin can read all error logs" on todoran.error_logs;
drop policy if exists "admin can read all feedback" on todoran.feedback;
drop policy if exists "admin can update feedback" on todoran.feedback;
drop function if exists todoran.is_admin();

-- ─── staff 테이블 ─────────────────────────────────────
-- user_id 기준 역할 부여. 이메일 문자열은 어디에도 저장하지 않음.
create table if not exists todoran.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  note text
);

-- 아무도 select/update/insert 못 함. service_role만 관리 (Supabase 대시보드에서 직접 조작).
-- 정책이 하나도 없으면 RLS 켠 순간 전면 차단됨.
alter table todoran.staff enable row level security;

-- ─── has_role() ─────────────────────────────────────
-- 지정된 역할을 가진 사용자인지 확인.
-- security definer로 staff 테이블 select 권한을 함수에 위임.
-- 함수 호출 시엔 auth.uid()로 본인 확인만 하므로 남 정보 조회 불가.
create or replace function todoran.has_role(required_role text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from todoran.staff
    where user_id = auth.uid()
      and role = required_role
  );
$$;

-- authenticated 사용자만 이 함수를 호출할 수 있게. anon은 애초에 auth.uid()가 null이라 무의미.
revoke all on function todoran.has_role(text) from public, anon;
grant execute on function todoran.has_role(text) to authenticated;

-- ─── error_logs / feedback RLS 재설정 ──────────────────
-- 003에서 만든 "own X read" 정책은 유지 (본인 로그는 본인이 봄).
-- 관리자용 정책만 새 함수 기반으로 추가.
create policy "staff admin reads all error logs" on todoran.error_logs
  for select
  using (todoran.has_role('admin'));

create policy "staff admin reads all feedback" on todoran.feedback
  for select
  using (todoran.has_role('admin'));

create policy "staff admin updates feedback" on todoran.feedback
  for update
  using (todoran.has_role('admin'))
  with check (todoran.has_role('admin'));

-- ─── 관리자 등록 방법 (수동, 커밋에 남기지 않음) ────────
-- Supabase 대시보드 SQL Editor에서 실행:
--   insert into todoran.staff (user_id, role, note)
--   values ('<auth.users의 uuid>', 'admin', '초기 관리자');
--
-- user_id는 Supabase Authentication → Users에서 대상 계정의 UID를 복사.
