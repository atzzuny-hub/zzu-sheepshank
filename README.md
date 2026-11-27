# Sheepshank

지금, 더 나은 내일을 위한 기록. 오늘을 기록하고, 내일을 준비하며, 조금 더 나은 방향으로 나아가도록 돕는 개인 성장 기록 서비스입니다.

## 처음 실행하기

1. 이 폴더에서 `npm install`
2. `.env.local.example` 을 `.env.local` 로 복사하고, Supabase 의 Project URL 과 공개 키(sb_publishable_…)를 넣기
3. `npm run dev` 를 실행하고 http://localhost:3000 열기
4. 이메일을 넣고 로그인 링크 받기 → 메일의 링크 누르기

Supabase 대시보드의 Authentication → URL Configuration 에
`http://localhost:3000` (Site URL) 과 `http://localhost:3000/auth/callback` (Redirect URLs) 이 있어야 로그인 링크가 돌아옵니다.

## 폴더

- `app/(app)/` 로그인 뒤 화면: 메인(`page.tsx`), `note`, `plan`, `momentum`, `about`
- `app/login`, `app/auth/callback` 로그인
- `components/Shell.tsx` 탭, 로그인 확인, 저장 상태
- `lib/data.ts` Supabase 읽기와 쓰기 전부
- `supabase/schema.sql` 테이블 구조 (이미 실행했다면 다시 실행하지 않아도 됩니다)
