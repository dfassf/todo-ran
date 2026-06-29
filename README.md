# 투두리스트 (todo-ran)

[![CI](https://github.com/shinwoo-um/todo-ran/actions/workflows/ci.yml/badge.svg)](https://github.com/shinwoo-um/todo-ran/actions/workflows/ci.yml)

물리적 행동으로만 완료 처리되는, 카테고리 색상이 한눈에 보이는 투두 웹앱.

> 와이프가 쓰라고 만든 개인 프로젝트입니다. 월간 캘린더로 한눈에 보면서 날짜별로도 따로 관리하고, 카테고리별 색상으로 종류를 구분하고 싶다는 요구사항에서 출발했습니다. iOS 앱 [닷투대시(dottodash.today)](https://dottodash.today/) 를 레퍼런스로 참고했고, **카테고리 색상 닷** 차별점을 더했습니다. 코드와 디자인 자산은 일체 사용하지 않았습니다.

## 핵심 기능

- **3가지 완수 방식** — 탭 / 횟수 / 타이머
- **카테고리 색상** — 카테고리에 색을 지정하면 할 일의 동그라미가 그 색으로 칠해져 모든 화면에서 한눈에 구분됨
- **3개 화면** — 홈(오늘 할 일 / 지난 할 일), 월간 캘린더, 날짜별 리스트
- **드래그로 순서 변경 + 날짜 이동** — 같은 날 안에서는 바로 순서가 바뀌고, 다른 날로 끌어다 놓으면 "옮길까요?" 확인 창이 뜸
- **로그인 없이 시작** — 게스트로 바로 쓰다가 나중에 가입하면 그동안 만든 데이터가 자동으로 옮겨짐
- **인터넷이 끊겨도 동작** — 데이터는 브라우저 안에 먼저 저장되고, 인터넷이 연결되면 서버와 자동으로 맞춰짐

## 사용한 도구

Next.js 16 (App Router) · TypeScript · Supabase (DB + 로그인 + 파일) · Dexie (브라우저 안 DB) · Tailwind CSS · Vitest (테스트) · Vercel (배포)

## 실행 방법

```bash
npm install
cp .env.example .env.local   # Supabase 주소와 키 채우기
# Supabase 대시보드 SQL Editor에서 supabase/migrations/001_init.sql 실행
npm run dev                  # http://localhost:3000
```

## 자주 쓰는 명령어

```bash
npm run dev              # 개발 서버 띄우기
npm run build            # 배포용 빌드
npm run verify           # 타입 검사 + 코드 점검 + 테스트 한 번에 (커밋 전 권장)
npm run test:coverage    # 테스트 커버리지 확인
```

## 더 자세한 문서

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 앱이 어떻게 구성되어 있는지, 데이터가 어떻게 흐르는지, 왜 이렇게 만들었는지
- [docs/SCHEMA.md](./docs/SCHEMA.md) — DB 표 구조, 접근 권한, 파일 저장 방식

## 라이선스

[MIT](./LICENSE)
