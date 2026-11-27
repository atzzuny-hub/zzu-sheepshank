-- Sheepshank 건강 화면의 표 (혈당, 몸무게, 건강 목표, 건강 메모)
-- Supabase 대시보드의 SQL Editor 에 이 파일 전체를 붙여 넣고 Run 을 누르세요.
-- 이미 있는 표는 건드리지 않아서, 여러 번 실행해도 괜찮습니다.

-- 1) 혈당 기록: 잰 날, 잰 시각('13:20', 모르면 빈칸), 수치(mg/dL), 잰 때(공복, 식후 2시간 …), 메모
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

-- 2) 몸무게 기록 (kg, 소수 한 자리)
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

-- 3) 건강 목표: 혈당 범위(mg/dL), 목표 몸무게(kg), 한 주 운동 시간(시간). 정하지 않은 것은 비워 둡니다
create table if not exists public.health_goals (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  glucose_low int not null default 70,
  glucose_high int not null default 130,
  weight_goal numeric(5,1),
  move_goal numeric(4,1)
);

-- 4) 건강 메모: 하루에 하나
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
