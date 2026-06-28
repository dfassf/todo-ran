# DB 설계

## Supabase 공용 프로젝트 사용

이 앱은 **다른 앱과 같은 Supabase 프로젝트(`common`)를 공유**한다. 각 앱은 고유 스키마로 격리된다.

| 항목 | 값 |
|---|---|
| 프로젝트 | `common` (ref: `cfdkabflrgphwpfmkzvh`) |
| 우리 앱 스키마 | `todoran` |
| 표 풀네임 | `todoran.categories`, `todoran.todos` |
| 클라이언트 라우팅 | `createSupabaseBrowserClient`가 `db: { schema: 'todoran' }`로 설정됨 → 코드에선 `supabase.from('todos')` 그대로 |
| 시크릿 보관 | `project-command-center/.secrets/supabase/projects.json` |

**Supabase 대시보드에서 한 번 해야 할 것**:
Settings → API → Exposed schemas 목록에 `todoran` 추가. (안 하면 PostgREST가 우리 스키마를 못 봄)

---

## 표 사이 관계

```
auth.users (Supabase 기본 로그인 정보)
   │ 한 명이
   │ 여러 카테고리를 가짐
   │
categories (카테고리)
   │ 한 카테고리에
   │ 여러 할 일이 묶임 (할 일은 카테고리 없이도 됨)
   │
todos (할 일)
```

카테고리를 지워도 그 카테고리에 속해있던 할 일은 사라지지 않는다. 할 일의 `category_id`만 비워진다 (`ON DELETE SET NULL`).

## `categories` 표

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 브라우저에서 `crypto.randomUUID()`로 만들어 채움 |
| `user_id` | uuid (FK → auth.users) | 주인이 탈퇴하면 같이 사라짐 (CASCADE) |
| `label` | text | 카테고리 이름 (예: "운동") |
| `color` | text | 색상 코드 `#RRGGBB` (예: `#10B981`) |
| `sort_order` | int | 사용자가 정한 순서 |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | 만든 시각 / 마지막 수정 시각 / 삭제 표시 시각 |

`updated_at`은 수정될 때마다 서버가 자동으로 현재 시각을 박는다 (트리거 사용). 브라우저 시계를 믿지 않기 위함.

인덱스: `(user_id)` — 사용자별 조회가 가장 잦으므로

## `todos` 표

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `id`, `user_id` | uuid | 위와 동일 |
| `category_id` | uuid (nullable) | 카테고리 안 정해도 됨. 카테고리 지워지면 비워짐 |
| `title` | text | 할 일 제목 |
| `due_date` | date | 어느 날의 할 일인지 (시간은 안 씀) |
| `completion_method` | text | 완수 방식: `tap`(한 번 탭) · `count`(횟수 채우기) · `timer`(시간 채우기) 중 하나 |
| `target_count` | int (nullable) | "물 5잔 마시기" 같은 횟수 목표 |
| `target_seconds` | int (nullable) | "25분 집중" 같은 시간 목표 |
| `current_count` | int | 횟수 방식의 현재 누적값 |
| `completed_at` | timestamptz (nullable) | 비어있으면 미완료, 시각이 박혀있으면 완료 |
| `sort_order` | int | 사용자가 정한 순서 |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | 위와 동일 |

인덱스: `(user_id, due_date)` — "오늘 할 일 보여줘" 같은 조회가 가장 잦으므로

## 접근 권한 (Row Level Security)

Postgres가 행 단위로 권한을 막아준다. 두 표 모두 같은 정책을 쓴다.

```sql
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

뜻: "로그인한 본인의 데이터만 보거나 고칠 수 있다." 다른 사람 데이터는 DB가 알아서 막는다. 클라이언트 코드의 실수를 신뢰하지 않는다.

## DB 변경 적용 (Migration)

| 파일 | 내용 |
|---|---|
| `supabase/migrations/001_init.sql` | `todoran` 스키마, 표 두 개, 트리거, RLS, 권한 부여 |

`common` Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run.

**주의**: 공용 프로젝트라 다른 앱 스키마(`sesangmansa`, `jjannae_diary` 등)는 절대 건드리지 않는다. 우리 SQL은 모두 `todoran.*` 또는 `create schema if not exists todoran` 만 다룬다.

## 시크릿

- 키 값: `project-command-center/.secrets/supabase/projects.json`
- 로컬 개발: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 채움
- 배포: Vercel 환경변수에 같은 두 키 등록

### API 키 종류 정리

Supabase가 2025년에 키 체계를 갱신함. todo-ran은 **새 방식 (publishable / secret)** 사용.

| 종류 | 용도 | 브라우저 노출 | todo-ran에서 사용? |
|---|---|---|---|
| **publishable** (`sb_publishable_...`) | 클라이언트, RLS로 보호 | OK | **사용** |
| **secret** (`sb_secret_...`) | 서버 전용, RLS 우회 | 절대 X | 사용 안 함 (백엔드 서버 없음) |
| legacy anon | 옛 방식 | OK | 사용 안 함 |
| legacy service_role | 옛 서버 키 | 절대 X | 사용 안 함 |

todo-ran은 브라우저가 Supabase를 직접 호출하는 구조라 secret key 쓸 일이 없다. 다른 앱 (예: sesangmansa)이 FastAPI 백엔드를 가져서 secret key를 쓰는 거고, 그 키는 `.secrets/projects/sesangmansa/.env`에 따로 보관됨.
