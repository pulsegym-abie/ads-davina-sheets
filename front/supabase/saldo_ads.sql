-- Run this once in Supabase Dashboard → SQL Editor.
-- Backs the /saldo-ads page: simple ledger of top-ups (masuk) and spend/withdrawals (keluar)
-- per platform (Meta / Google), shared across all logged-in team members.

create table if not exists public.saldo_ads_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  platform text not null check (platform in ('meta', 'google')),
  type text not null check (type in ('in', 'out')),
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

create index if not exists saldo_ads_transactions_date_idx
  on public.saldo_ads_transactions (date desc);

alter table public.saldo_ads_transactions enable row level security;

create policy "Authenticated users can read saldo ads transactions"
  on public.saldo_ads_transactions for select
  to authenticated
  using (true);

create policy "Authenticated users can add saldo ads transactions"
  on public.saldo_ads_transactions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete saldo ads transactions"
  on public.saldo_ads_transactions for delete
  to authenticated
  using (true);
