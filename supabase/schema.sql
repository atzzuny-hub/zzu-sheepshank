-- Sheepshank 데이터베이스 구조
-- Supabase 대시보드의 SQL Editor에 전체를 붙여 넣고 Run을 누르세요.

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


-- ===== 건강 (2026-11 에 더함) =====
-- 위의 표를 이미 만들어 두었다면, 이 줄부터 끝까지만 SQL Editor 에 붙여 넣고 Run 을 누르세요.
-- 여러 번 실행해도 괜찮습니다.

-- 8) 혈당 기록: 잰 날, 잰 시각('13:20', 모르면 빈칸), 수치(mg/dL), 잰 때(공복, 식후 2시간 …), 메모
create table if not exists public.glucose (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  at text not null default '' check (at ~ '^(\d{2}:\d{2})?$'),
  value int not null check (value between 10 and 999),
  kind text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists glucose_user_date_idx on public.glucose (user_id, date);

-- 9) 몸무게 기록 (kg, 소수 한 자리)
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  at text not null default '' check (at ~ '^(\d{2}:\d{2})?$'),
  value numeric(5,1) not null check (value between 10 and 500),
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists weights_user_date_idx on public.weights (user_id, date);

-- 10) 건강 목표: 혈당 범위(mg/dL), 목표 몸무게(kg), 한 주 운동 시간(시간). 정하지 않은 것은 비워 둡니다
create table if not exists public.health_goals (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  glucose_low int not null default 70,
  glucose_high int not null default 130,
  weight_goal numeric(5,1),
  move_goal numeric(4,1)
);

-- 11) 건강 메모: 하루에 하나
create table if not exists public.health_notes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  note text not null default '',
  primary key (user_id, date)
);

alter table public.glucose      enable row level security;
alter table public.weights      enable row level security;
alter table public.health_goals enable row level security;
alter table public.health_notes enable row level security;

drop policy if exists "own rows" on public.glucose;
create policy "own rows" on public.glucose for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.weights;
create policy "own rows" on public.weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.health_goals;
create policy "own rows" on public.health_goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on public.health_notes;
create policy "own rows" on public.health_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
