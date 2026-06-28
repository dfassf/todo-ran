-- 002_sort_order_bigint.sql
-- sort_order를 int → bigint로 확장.
--
-- 이유: 클라이언트의 createTodo가 sort_order에 Date.now()를 채워넣는데
-- Date.now()는 13자리 (예: 1782648150969)라 Postgres int(4 bytes, 약 21억 = 10자리) 범위 초과.
-- → 오버플로우로 upsert 실패 ("value ... is out of range for type integer")
--
-- bigint(8 bytes)는 약 9.2 × 10^18까지 가능 → 충분.

alter table todoran.categories alter column sort_order type bigint;
alter table todoran.todos alter column sort_order type bigint;
