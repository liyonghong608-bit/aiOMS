-- =====================================================================
-- aiOMS — Supplier Applications schema + RLS + auto-promote trigger
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query)
-- =====================================================================

-- 1. Table
create table if not exists public.supplier_applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  company_name      text not null,
  business_address  text,
  tax_id            text,
  phone             text,
  website           text,
  categories        text,
  years_in_business int,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  notes             text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz
);

create index if not exists supplier_applications_user_idx
  on public.supplier_applications(user_id);
create index if not exists supplier_applications_status_idx
  on public.supplier_applications(status);

-- 2. Row-level security
alter table public.supplier_applications enable row level security;

-- A buyer can read their own application(s)
drop policy if exists "sa_read_own" on public.supplier_applications;
create policy "sa_read_own"
  on public.supplier_applications
  for select
  using (auth.uid() = user_id);

-- A buyer can submit (insert) only their own application
drop policy if exists "sa_insert_own" on public.supplier_applications;
create policy "sa_insert_own"
  on public.supplier_applications
  for insert
  with check (auth.uid() = user_id);

-- Admins can read / update / delete everything
drop policy if exists "sa_admin_all" on public.supplier_applications;
create policy "sa_admin_all"
  on public.supplier_applications
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Auto-promote on approval
--    When status transitions to 'approved', flip the user's profile.role
--    to 'supplier' and stamp reviewed_at.
create or replace function public.promote_on_supplier_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    update public.profiles set role = 'supplier' where id = new.user_id;
    new.reviewed_at := coalesce(new.reviewed_at, now());
  elsif new.status = 'rejected' and (old.status is null or old.status <> 'rejected') then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_promote_on_supplier_approval on public.supplier_applications;
create trigger trg_promote_on_supplier_approval
  before update on public.supplier_applications
  for each row
  execute function public.promote_on_supplier_approval();
