# Claude Instructions for todo-ran

## 프로젝트 개요

- **이름**: 투두리스트 (폴더명 todo-ran은 와이프 이름에서)
- **목적**: 와이프(오란)용 개인 투두 웹앱
- **레퍼런스**: iOS 앱 닷투대시(dottodash.today) 참고
- **차별점**: 카테고리에 색을 지정하면 할 일 동그라미가 그 색으로 칠해져 한눈에 종류 구분

## 사용한 도구

- Next.js 15 (App Router) + TypeScript strict
- Supabase (DB + 로그인 + 파일 저장), 별도 백엔드 없음
- 로그인: 이메일/비밀번호 (Google 로그인은 다음 단계)
- 브라우저 안 DB: IndexedDB를 Dexie 라이브러리로 다룸 (게스트 모드 + 오프라인 대응)
- 동기화: 두 기기 간 양방향. 충돌 시 마지막에 수정된 쪽이 이김 (`updated_at` 기준)
- UI: Tailwind CSS + 직접 만든 컴포넌트
- 배포: Vercel 한 곳

## 코드 스타일

- TypeScript strict, 안 쓰는 변수/매개변수 금지
- 함수형 컴포넌트만, hook 우선
- 한글 UI 텍스트 그대로 사용
- 주석은 "왜"만 적기, "무엇"은 코드로 드러내기

## 디자인 원칙

- 모바일 우선 (max-w-app = 480px)
- 데스크탑에서는 가운데 정렬
- 라이트 모드만 (다크 모드는 다음 단계)
- CSS 변수로 디자인 토큰 관리 (globals.css)

## DB / 동기화 규칙

- `id`는 브라우저가 `crypto.randomUUID()`로 만들어 채움 (오프라인에서도 새 행 생성 가능)
- 모든 표는 Row Level Security 활성화, 정책은 `auth.uid() = user_id`
- 삭제는 표시만 (`deleted_at` 세팅). 실제 삭제 금지
- `updated_at`은 서버 트리거가 강제 갱신 (브라우저 시계 신뢰 X)
- 충돌 해결은 행 통째로 비교. 필드 단위 합치기 안 함
- 게스트 → 가입 전환: 1회 데이터 이관 후 일반 동기화 동작

## 완수 방식

- tap (한 번 탭) / count (정해진 횟수만큼 탭) / timer (정해진 시간 채우기) 3종
- DB CHECK 제약도 3종으로 강제
- 추후 확장(사진/서명/길게 등) 필요해지면 CHECK 제약과 UI를 함께 늘림

## 폴더 구조

`/Users/test/.claude/plans/wondrous-wandering-crown.md` 플랜 파일 참조

## Git

- 이메일: REDACTED-EMAIL
- 메시지: 한국어
- Co-Authored-By 줄 추가 금지
- 커밋/푸시는 명시적 지시가 있을 때만

## 배포

- Vercel (프론트엔드 + API 통합)
- Supabase DB 변경은 `supabase/migrations/*.sql` 파일로 관리
- 환경변수는 `.env.example` 참고
