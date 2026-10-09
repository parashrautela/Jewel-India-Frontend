-- ============================================================
-- JEWELLER APP — SUPABASE SCHEMA SETUP
-- Run every block in order in the Supabase SQL Editor
-- ============================================================

-- ── 0. MIGRATION — add missing columns if table already exists ─
-- Safe to run even on a fresh DB (all IF NOT EXISTS).
-- Run this FIRST if you already have a partial products table.

alter table if exists public.products
  add column if not exists wholesaler_id       uuid,
  add column if not exists wholesaler_email    text,
  add column if not exists title               text,
  add column if not exists jewellery_type      text,
  add column if not exists category            text,
  add column if not exists style               text,
  add column if not exists size                text,
  add column if not exists stock_available     boolean default false,
  add column if not exists make_to_order_days  integer,
  add column if not exists metal_purity        text,
  add column if not exists net_weight          numeric,
  add column if not exists gross_weight        numeric,
  add column if not exists stone_weight        numeric,
  add column if not exists raw_image_url       text,
  add column if not exists processed_image_url text,
  add column if not exists is_published        boolean default false,
  add column if not exists ai_processing_state text default 'none',
  add column if not exists ai_processing_run_id uuid,
  add column if not exists ai_verified_output_urls text[] default '{}',
  add column if not exists ai_completed_at     timestamptz,
  add column if not exists created_at          timestamptz default now();

-- Drop old policies (if any) so we can recreate them safely
drop policy if exists "Anyone can view products"            on public.products;
drop policy if exists "Wholesalers can insert own products" on public.products;
drop policy if exists "Wholesalers can update own products" on public.products;
drop policy if exists "Wholesalers can delete own products" on public.products;

-- ── HOTFIX: allow RLS update on unclaimed rows ──────────────────
-- The backend creates product rows via service role without setting wholesaler_id
-- (it has no knowledge of the logged-in user). The frontend's saveProduct() then
-- does an UPDATE to claim the row. If wholesaler_id is NULL the old policy
-- evaluated auth.uid()=NULL → false → silently blocked every save.
alter table if exists public.products
  add column if not exists generated_image_urls text[] default '{}';

-- Drop old profiles policies too (safe to recreate)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile"       on public.profiles;
drop policy if exists "Users can update their own profile"       on public.profiles;

-- ── 1. PROFILES TABLE ────────────────────────────────────────
-- Stores the role (wholesaler | retailer) for every user

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('wholesaler', 'retailer')),
  full_name   text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);


-- ── 2. PRODUCTS TABLE ────────────────────────────────────────
-- Stores every product uploaded by a wholesaler

create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  wholesaler_id        uuid not null references auth.users(id) on delete cascade,
  wholesaler_email     text,
  title                text,
  jewellery_type       text,
  category             text,
  style                text,
  size                 text,
  stock_available      boolean  default false,
  make_to_order_days   integer,
  metal_purity         text,
  net_weight           numeric,
  gross_weight         numeric,
  stone_weight         numeric,
  raw_image_url        text,
  processed_image_url  text,
  is_published         boolean  default true,
  created_at           timestamptz default now()
);

alter table public.products enable row level security;

-- Anyone (incl. un-authenticated retailers) can VIEW all products
create policy "Anyone can view products"
  on products for select using (true);

-- Only the wholesaler who owns the product can insert
create policy "Wholesalers can insert own products"
  on products for insert with check (auth.uid() = wholesaler_id);

-- Only the wholesaler who owns the product can update.
-- Also allows updating rows where wholesaler_id IS NULL — these are rows just
-- created by the backend pipeline (no user context) waiting to be claimed by
-- the authenticated wholesaler via saveProduct().
create policy "Wholesalers can update own products"
  on products for update using (
    auth.uid() = wholesaler_id
    OR wholesaler_id IS NULL
  );

-- Only the wholesaler who owns the product can delete
create policy "Wholesalers can delete own products"
  on products for delete using (auth.uid() = wholesaler_id);


-- ── 3. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
-- Reads the `role` key from user_metadata set during email signup.
-- For Google OAuth users, no profile is created here — they are
-- redirected to /select-role to choose a role after first sign-in.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Auto-insert profile for all signups.
  -- If role is provided in metadata (e.g., from an invite), use it.
  -- Otherwise, default to 'wholesaler' for public OTP signups.
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'wholesaler')
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 5. RETAILER SELECTIONS TABLE ─────────────────────────────
-- Stores which wholesaler products a retailer has selected for "Your Taste"

create table if not exists public.retailer_selections (
  retailer_id uuid references public.retailers(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (retailer_id, product_id)
);

alter table public.retailer_selections enable row level security;

drop policy if exists "Retailers can view own selections" on public.retailer_selections;
drop policy if exists "Retailers can insert own selections" on public.retailer_selections;
drop policy if exists "Retailers can delete own selections" on public.retailer_selections;

create policy "Retailers can view own selections"
  on retailer_selections for select using (
    retailer_id in (select id from retailers where user_id = auth.uid())
  );

create policy "Retailers can insert own selections"
  on retailer_selections for insert with check (
    retailer_id in (select id from retailers where user_id = auth.uid())
  );

create policy "Retailers can delete own selections"
  on retailer_selections for delete using (
    retailer_id in (select id from retailers where user_id = auth.uid())
  );

-- Allow employees to READ retailer_selections for their linked retailer
-- This lets the employee gallery page fetch selections without needing the service role.
drop policy if exists "Employees can view their retailer selections" on public.retailer_selections;
create policy "Employees can view their retailer selections"
  on retailer_selections for select using (
    retailer_id in (
      select retailer_id from employees where auth_user_id = auth.uid()
    )
  );
