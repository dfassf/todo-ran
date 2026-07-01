-- 003_logs_and_feedback.sql
-- 에러 로그 + 사용자 문제 접수 테이블
--
-- error_logs: 앱에서 자동으로 수집한 기술 에러 (sync 실패, 예외 등)
-- feedback:  사용자가 자발적으로 남긴 문제 신고/의견
--
-- 두 테이블 모두 todoran 스키마에 격리.
-- RLS: 본인 것만 insert/select 가능. 익명 게스트도 로그를 남길 수 있도록 user_id nullable.

-- ─── error_logs ─────────────────────────────────────────
create table if not exists todoran.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  context text not null,      -- 어디서 났나 (예: "sync.pull", "auth.signin")
  message text not null,      -- 에러 메시지
  detail jsonb,               -- code, hint, stack 등 자유 필드
  user_agent text,            -- 브라우저 정보
  path text,                  -- 발생 시 URL 경로
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_idx on todoran.error_logs (created_at desc);
create index if not exists error_logs_user_idx on todoran.error_logs (user_id);

-- ─── feedback ─────────────────────────────────────────
create table if not exists todoran.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'issue'
    check (kind in ('issue','idea','other')),
  body text not null,         -- 사용자가 쓴 본문
  path text,                  -- 신고 당시 URL 경로
  user_agent text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz     -- 행님이 확인 후 표시하는 용도
);

create index if not exists feedback_created_idx on todoran.feedback (created_at desc);
create index if not exists feedback_unresolved_idx on todoran.feedback (created_at desc)
  where resolved_at is null;

-- ─── 권한 (anon도 insert 가능해야 게스트가 문제 신고 가능) ────
grant insert on todoran.error_logs to anon, authenticated;
grant select on todoran.error_logs to authenticated;
grant insert on todoran.feedback to anon, authenticated;
grant select on todoran.feedback to authenticated;

-- ─── RLS ─────────────────────────────────────────
alter table todoran.error_logs enable row level security;
alter table todoran.feedback enable row level security;

-- 누구나 insert 가능. select는 본인 것만 (로그인된 경우).
drop policy if exists "anyone can insert error logs" on todoran.error_logs;
create policy "anyone can insert error logs" on todoran.error_logs
  for insert
  with check (true);

drop policy if exists "own error logs read" on todoran.error_logs;
create policy "own error logs read" on todoran.error_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "anyone can insert feedback" on todoran.feedback;
create policy "anyone can insert feedback" on todoran.feedback
  for insert
  with check (true);

drop policy if exists "own feedback read" on todoran.feedback;
create policy "own feedback read" on todoran.feedback
  for select
  using (auth.uid() = user_id);
