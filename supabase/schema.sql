-- Sheepshank 데이터베이스 구조
-- 처음 설치할 때 한 번만, Supabase 대시보드의 SQL Editor에 전체를 붙여 넣고 Run을 누르세요.
-- 이미 실행해서 쓰고 있는 곳에 다시 실행하면 "already exists" 오류가 나고 아무것도 바뀌지 않습니다.
-- 건강 화면의 표는 supabase/health.sql 에 따로 있습니다 (이 파일 다음에, 또는 나중에 그 파일만 실행하세요).

-- 1) 설정: 계획 탭 가운데 원의 목표 날짜
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  future_date date
);

-- 2) 영역: 계획 탭의 상자 (경제적 성장, 건강한 사람 …)
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) 할 일: 영역 아래의 항목. is_key 가 true 면 별표로 뽑은 일 = 노트의 지킬 일
--    area_id 가 비어 있으면 영역 없이 직접 추가한 지킬 일
create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references public.areas on delete cascade,
  text text not null default '',
  is_key boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index actions_user_idx on public.actions (user_id, is_key);

-- 4) 하루 한 줄
create table public.days (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  note text not null default '',
  primary key (user_id, date)
);

-- 5) 체크: X 표시 하나가 한 행
create table public.checks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  action_id uuid not null references public.actions on delete cascade,
  primary key (user_id, date, action_id)
);

-- 6) 달별 캐치프레이즈 (ym 예: '2026-11')
create table public.months (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ym text not null check (ym ~ '^\d{4}-\d{2}$'),
  phrase text not null default '',
  primary key (user_id, ym)
);

-- 7) 모멘텀 일기: 쏟아내기 / 알아주기 / 가르치기
create table public.journals (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  pour text not null default '',
  listen text not null default '',
  teach text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 보안 규칙(RLS): 모든 테이블에서 본인 행만 읽고 쓸 수 있습니다.
alter table public.settings enable row level security;
alter table public.areas    enable row level security;
alter table public.actions  enable row level security;
alter table public.days     enable row level security;
alter table public.checks   enable row level security;
alter table public.months   enable row level security;
alter table public.journals enable row level security;

create policy "own rows" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.areas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.actions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.days for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.checks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.months for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.journals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
