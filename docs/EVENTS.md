# 이벤트 파이프라인 설계

## 왜 만드나

지금 있는 데이터(`categories`, `todos`)만으로도 뽑을 수 있는 통계는 많다 — 완수율, 카테고리별 활동, 요일/시간대 분포 등. **소급 적용 가능**.

하지만 다음은 이벤트가 없으면 뽑을 수 없다:

- "탭을 몇 번 눌러서 완료했나" (count 방식의 진행 이력)
- "며칠 미뤘다가 완료했나" (due_date 변경 이력)
- "몇 번 열었나 / 얼마나 자주 켜나" (앱 진입)
- "타이머를 몇 번 껐다 켰나" (중도 포기 패턴)
- "어떤 순간에 어떤 카테고리를 만들었나" (사용자 여정)

**소급 안 되므로 지금부터 쌓아둔다.** 리포트 화면은 나중에.

## 원칙

- **범용 events 테이블 하나** — 이벤트 종류 늘어나도 스키마 안 바꿈
- **로그인된 사용자만 서버 전송** — 게스트는 이벤트 X (정체 없음, 나중에 리포트 대상 아님)
- **배치 전송** — 5초 모아서 한 번에 insert (탭 이벤트가 초당 몇 번 나올 수 있음)
- **실패 무해** — 이벤트 전송 실패해도 앱 기능은 절대 영향 X
- **PII 금지** — 사용자 입력 텍스트(할 일 제목 등) 이벤트에 담지 않음

## 스키마

`supabase/migrations/004_events.sql` 로 추가 예정 (다음 라운드).

```sql
create table todoran.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,          -- 이벤트 종류 (아래 카탈로그)
  entity_id uuid,              -- 관련 row id (todo.id / category.id 등)
  meta jsonb,                  -- 자유 필드
  created_at timestamptz not null default now()
);

create index events_user_created_idx on todoran.events (user_id, created_at desc);
create index events_type_created_idx on todoran.events (type, created_at desc);
```

RLS: 본인 이벤트만 insert/select.

## 이벤트 카탈로그 (Phase 1)

| type               | entity_id   | meta                                            | 언제                                 |
| ------------------ | ----------- | ----------------------------------------------- | ------------------------------------ |
| `app.opened`       | —           | `{ path }`                                      | 세션당 1회, AutoSeedRunner 마운트 시 |
| `todo.created`     | todo.id     | `{ method, has_category }`                      | createTodo 성공                      |
| `todo.updated`     | todo.id     | `{ changed_fields: [...] }`                     | updateTodo 성공 (진행값 제외)        |
| `todo.deleted`     | todo.id     | —                                               | deleteTodo (소프트)                  |
| `todo.completed`   | todo.id     | `{ method, elapsed_ms }`                        | completed_at null → 시각 세팅        |
| `todo.uncompleted` | todo.id     | —                                               | completed_at 시각 → null             |
| `todo.count_tap`   | todo.id     | `{ current, target }`                           | count 방식 탭 (완료 도달 여부 무관)  |
| `todo.timer_start` | todo.id     | `{ target_seconds }`                            | timer 시작                           |
| `todo.timer_stop`  | todo.id     | `{ elapsed_sec, reason: 'user' \| 'complete' }` | timer 정지                           |
| `todo.date_moved`  | todo.id     | `{ from, to }`                                  | due_date 변경                        |
| `todo.reordered`   | —           | `{ count }`                                     | reorderTodos 호출 (개별 x, 일괄 1회) |
| `category.created` | category.id | `{ color }`                                     | createCategory                       |
| `category.updated` | category.id | `{ changed_fields }`                            | updateCategory                       |
| `category.deleted` | category.id | —                                               | deleteCategory (소프트)              |

**Phase 2 이후 후보** (지금 안 함):

- `sheet.opened` / `sheet.closed` — 어떤 화면 얼마나 봤나
- `sync.error` — 이미 error_logs로 커버되므로 중복
- `feedback.submitted` — feedback 테이블 자체가 이벤트라 중복

## 수집 지점

**client-side, 로컬 액션 성공 직후**:

- `repo.createTodo` → `todo.created`
- `repo.updateTodo` → `todo.updated` (진행 관련 patch면 completed/uncompleted/count_tap/date_moved로 분기)
- `repo.deleteTodo` → `todo.deleted`
- `repo.createCategory` → `category.created`
- `repo.updateCategory` → `category.updated`
- `repo.deleteCategory` → `category.deleted`
- `repo.reorderTodos` → `todo.reordered`
- CompletionMethods/Timer 컴포넌트 → `todo.timer_start/stop`
- `AutoSeedRunner` (or 별도 mount 훅) → `app.opened`

**서버 push는 로그인된 사용자만.** 게스트는 무시.

## 배치 전송 설계

```
액션 → logEvent(type, entity_id, meta)
       ↓
   in-memory queue (Array<Event>)
       ↓ (5초 debounce or 20개 초과 시)
   supabase.from("events").insert(batch)
       ↓ 성공: 큐 비움
       ↓ 실패: 큐 유지, 다음 flush 시 재시도
```

- 앱 종료 직전 (`visibilitychange` → hidden) 큐 강제 flush
- 로그인 안 됐으면 큐잉도 X (메모리 절약)
- **최대 큐 크기 500** — 넘으면 오래된 것부터 버림 (무한 증식 방지)

## PII 방지 규칙

- 이벤트 meta에 `title`, `label` 같은 사용자 입력 텍스트 절대 안 담음
- 이벤트로는 id, timestamp, 방식 종류, boolean, 숫자만 담음
- 필요하면 조회 시 events + todos JOIN해서 title 확인 (본인 데이터니까 RLS 자동)

## 리포트 예시 쿼리 (Phase 2에서 사용 예정)

**"이번 주 완수율"**

```sql
select
  count(*) filter (where type = 'todo.completed') * 1.0
  / nullif(count(*) filter (where type = 'todo.created'), 0)
from todoran.events
where user_id = auth.uid()
  and created_at >= date_trunc('week', now());
```

**"완수 방식별 완료율"**

```sql
select
  meta->>'method' as method,
  count(*) as completed,
  avg((meta->>'elapsed_ms')::bigint / 1000) as avg_sec
from todoran.events
where user_id = auth.uid()
  and type = 'todo.completed'
group by 1;
```

**"카테고리별 count_tap 총합"**

```sql
select
  t.category_id,
  count(e.*) as tap_count
from todoran.events e
join todoran.todos t on t.id = e.entity_id
where e.user_id = auth.uid()
  and e.type = 'todo.count_tap'
group by 1;
```

**"미뤄진 할 일 (date_moved 여러 번)"**

```sql
select entity_id, count(*) as move_count
from todoran.events
where user_id = auth.uid()
  and type = 'todo.date_moved'
group by 1
having count(*) >= 2
order by move_count desc;
```

## 로드맵

**Phase 1 (이 문서에서 정의)** — **다음 라운드에서 구현**

- 004 마이그레이션 (events 테이블)
- `src/lib/events-log.ts` (배치 큐 + 전송)
- 위 수집 지점 12개 적용
- 로그인된 사용자만 전송, 게스트는 무시

**Phase 2 (Phase 1 검증 후)**

- 관리자 리포트 페이지 `/admin/report`
- 사용자 대시보드 `/insights` (본인 완수율, 카테고리 분포 등)

**Phase 3 (필요해지면)**

- 이벤트 aggregation view (매일 집계 캐시)
- 사용자 알림 ("이번 주 목표 80% 달성!")
- 앱 진입 이벤트 → 리텐션 분석

## 이 문서와 관련 없는 것

- **Sentry 등 외부 서비스** — 사용 안 함 (서드파티 최소화 방침)
- **PII 수집** — 절대 안 함
- **A/B 테스트, funnel 분석** — 1인 사용 앱에 오버
