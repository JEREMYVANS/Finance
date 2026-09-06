-- =====================================================================
-- 财务仪表盘 · 应急储蓄云端同步 建表脚本
-- 用途：把「应急储蓄当前金额 / 目标金额」存到 Supabase，做到多端一致
-- 执行位置：Supabase 后台 → SQL Editor → 粘贴本文件 → Run
-- 说明：已存在则自动跳过（if not exists）
-- =====================================================================

-- 1) 新建表：每个用户一行
create table if not exists public.finance_savings (
  user_id   uuid      primary key references auth.users(id),
  current   numeric   not null default 0,        -- 应急储蓄当前金额
  goal      numeric   not null default 50000,    -- 应急储蓄目标金额
  updated_at timestamptz not null default now()
);

-- 2) 开启行级安全（RLS）：默认拒绝一切，必须显式授权
alter table public.finance_savings enable row level security;

-- 3) 授权策略：用户只能读写自己的那一行
drop policy if exists "savings_own" on public.finance_savings;
create policy "savings_own"
  on public.finance_savings
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);
