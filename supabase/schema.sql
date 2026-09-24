-- Run this in the Supabase SQL Editor before enabling cloud accounts.
create table if not exists public.user_stocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_stocks_user_id_idx on public.user_stocks(user_id);

alter table public.user_stocks enable row level security;
drop policy if exists "Users can manage their own stocks" on public.user_stocks;
create policy "Users can manage their own stocks"
  on public.user_stocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.calculation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid,
  stock_name text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists calculation_history_user_created_idx
  on public.calculation_history(user_id, created_at desc);

alter table public.calculation_history enable row level security;
drop policy if exists "Users can manage their own calculation history" on public.calculation_history;
create policy "Users can manage their own calculation history"
  on public.calculation_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
