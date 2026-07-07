-- 006_hardening.sql
-- 보안 감사에서 나온 항목 2개 대응:
--   (1) error_logs / feedback insert 크기 제한 (스팸/DoS 방어)
--   (2) has_role() 함수에 search_path 명시 (스키마 오염 방어)

-- ─── (1) error_logs 크기 제한 ─────────────────────────────
-- RLS는 "누가 insert 가능" 만 판단하지 "얼마나 큰 값" 은 제어 못 함.
-- publishable key로 anon도 insert 가능하니 무제한 페이로드로 DB 폭탄 가능.
-- CHECK 제약으로 컬럼별 최대 크기를 물리적으로 막음.

alter table todoran.error_logs
  add constraint error_logs_context_size check (length(context) <= 200);

alter table todoran.error_logs
  add constraint error_logs_message_size check (length(message) <= 2000);

alter table todoran.error_logs
  add constraint error_logs_detail_size check (
    detail is null or pg_column_size(detail) <= 10000
  );

alter table todoran.error_logs
  add constraint error_logs_user_agent_size check (
    user_agent is null or length(user_agent) <= 500
  );

alter table todoran.error_logs
  add constraint error_logs_path_size check (
    path is null or length(path) <= 500
  );

-- ─── (1') feedback 크기 제한 ─────────────────────────────
-- 사용자 피드백이라 message 는 크게 잡되(글 길게 쓸 수 있음),
-- 스팸 봇이 megabyte 단위로 밀어넣지는 못하게 8KB 상한.

alter table todoran.feedback
  add constraint feedback_body_size check (length(body) <= 8000);

alter table todoran.feedback
  add constraint feedback_path_size check (
    path is null or length(path) <= 500
  );

alter table todoran.feedback
  add constraint feedback_user_agent_size check (
    user_agent is null or length(user_agent) <= 500
  );

-- ─── (2) has_role() search_path 고정 ─────────────────────
-- security definer 함수는 caller의 search_path 를 물려받으면 위험.
-- 다른 스키마에 fake staff 테이블을 심고 search_path 조작 → 우회 가능.
-- todoran + pg_catalog 로 고정해서 외부 오염 차단.
--
-- 함수 시그니처는 동일하므로 CREATE OR REPLACE 로 덮어쓴다.

create or replace function todoran.has_role(required_role text)
returns boolean
language sql
security definer
stable
set search_path = todoran, pg_catalog
as $$
  select exists (
    select 1
    from todoran.staff
    where user_id = auth.uid()
      and role = required_role
  );
$$;
