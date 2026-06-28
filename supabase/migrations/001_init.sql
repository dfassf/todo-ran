-- 001_init.sql
-- todoran 전용 스키마 + 테이블 + RLS + updated_at 트리거
--
-- 공용 Supabase 프로젝트(common)에 입주하는 방식이므로 스키마로 격리.
-- 스키마 이름 컨벤션: 앱 폴더명(하이픈 제외) → `todoran`
--
-- Supabase 대시보드의 SQL Editor에서 한 번 실행하면 끝.

create extension if not exists "pgcrypto";

-- 1) 스키마 생성 + Supabase API에 노출
create schema if not exists todoran;
grant usage on schema todoran to anon, authenticated, service_role;

-- ─── categories ──────────────────────────────────────────
create table if not exists todoran.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  color text not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists categories_user_idx on todoran.categories (user_id);

-- ─── todos ──────────────────────────────────────────
create table if not exists todoran.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references todoran.categories(id) on delete set null,
  title text not null,
  due_date date not null,

  completion_method text not null default 'tap'
    check (completion_method in ('tap','count','timer')),
  target_count int,
  target_seconds int,

  current_count int not null default 0,
  completed_at timestamptz,

  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists todos_user_date_idx on todoran.todos (user_id, due_date);

-- ─── updated_at 자동 갱신 (클라 시계 신뢰 X, 서버 강제) ──────────────
create or replace function todoran.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_categories_updated on todoran.categories;
create trigger trg_categories_updated
  before update on todoran.categories
  for each row execute function todoran.set_updated_at();

drop trigger if exists trg_todos_updated on todoran.todos;
create trigger trg_todos_updated
  before update on todoran.todos
  for each row execute function todoran.set_updated_at();

-- ─── 권한 (스키마 위에 anon/authenticated가 테이블에 접근 가능하게) ────
grant all on todoran.categories to anon, authenticated, service_role;
grant all on todoran.todos to anon, authenticated, service_role;

-- ─── RLS ──────────────────────────────────────────
alter table todoran.categories enable row level security;
alter table todoran.todos enable row level security;

drop policy if exists "own categories" on todoran.categories;
create policy "own categories" on todoran.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own todos" on todoran.todos;
create policy "own todos" on todoran.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
