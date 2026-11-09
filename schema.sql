-- Run in the Supabase SQL editor. Review policies with a qualified developer before production.
create type public.account_role as enum ('customer','provider','admin');
create type public.order_status as enum ('new','accepted','in_progress','completed','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.account_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  provider_id uuid references public.profiles(id),
  service text not null check (service in ('grocery','pharmacy','errands','senior_help','transport','other')),
  address text not null,
  requested_for timestamptz,
  details text,
  status public.order_status not null default 'new',
  created_at timestamptz not null default now()
);

-- Create a profile after signup. Role from user metadata is intentionally ignored:
-- new users always become customers; promote providers/admins manually after verification.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

create policy "profiles read own" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles update own contact" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "customers create own orders" on public.orders
for insert to authenticated with check (customer_id = auth.uid());
create policy "customers read own orders" on public.orders
for select to authenticated using (customer_id = auth.uid());
create policy "providers read new or assigned orders" on public.orders
for select to authenticated using (
  status = 'new' or provider_id = auth.uid()
);
create policy "providers accept new orders" on public.orders
for update to authenticated using (status = 'new' or provider_id = auth.uid())
with check (provider_id = auth.uid());

-- IMPORTANT:
-- This starter schema is not a complete production authorization model.
-- Admin policies, safe provider assignment, status-transition validation,
-- customer cancellation, audit logs and anti-abuse controls must be added
-- before real orders. Do not expose admin privileges through client metadata.
