-- =====================================================================
-- 财务仪表盘 · Supabase 表结构 + 行级安全（RLS）
-- 在 Supabase 控制台的 SQL Editor 中一次性执行本文件即可。
-- =====================================================================

-- 1) 数据表：每月一条记录
create table if not exists public.finance_records (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  month         text not null,                 -- YYYY-MM
  salary        numeric not null default 0,
  prev_balance  numeric not null default 0,
  saving_fund   numeric not null default 0,    -- 基金储蓄
  giving_mom    numeric not null default 0,    -- 给妈妈
  auto_loan     numeric not null default 0,    -- 车贷
  car_term      integer not null default 1,    -- 车贷期数 1~60（自动累加）
  charging      numeric not null default 0,    -- 充电
  parking       numeric not null default 0,    -- 停车
  house_loan    numeric not null default 0,    -- 房贷
  house_term    integer not null default 1,    -- 房贷期数 1~360（自动累加）
  property_fee  numeric not null default 0,    -- 物业费
  vehicle_fee   numeric not null default 0,    -- 车辆管理费
  water         numeric not null default 0,    -- 水费
  electricity   numeric not null default 0,    -- 电费
  gas           numeric not null default 0,    -- 气费
  created_at    timestamptz not null default now(),
  unique (user_id, month)                     -- 同一用户每月仅一条
);

-- 2) 开启行级安全
alter table public.finance_records enable row level security;

-- 3) 策略：用户只能看/改自己的数据
drop policy if exists "own_select" on public.finance_records;
create policy "own_select" on public.finance_records
  for select using (auth.uid() = user_id);

drop policy if exists "own_insert" on public.finance_records;
create policy "own_insert" on public.finance_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_update" on public.finance_records;
create policy "own_update" on public.finance_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_delete" on public.finance_records;
create policy "own_delete" on public.finance_records
  for delete using (auth.uid() = user_id);

-- 4) 启用邮箱/密码登录（在 Dashboard → Authentication → Providers 中打开 Email 开关）
--    Supabase 默认即开启，无需额外 SQL；这里仅作提醒注释。
