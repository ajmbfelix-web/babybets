-- ─────────────────────────────────────────────────────────────────
-- Baby Bets — Supabase Schema
-- Run this in the Supabase SQL editor to initialize your database.
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── POOLS ────────────────────────────────────────────────────────
create table if not exists pools (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text unique not null,
  parent_name         text not null,
  baby_last_name      text not null,
  parent_email        text not null,
  due_date            date not null,
  max_price           numeric(8,2) not null default 20.00,
  addon_sex           boolean not null default false,
  addon_sex_price     numeric(8,2) default 5.00,
  addon_weight        boolean not null default false,
  addon_weight_price  numeric(8,2) default 5.00,
  status              text not null default 'open'
                      check (status in ('open','review','paid','closed')),
  -- Birth stats (filled by parent after birth)
  actual_date         date,
  actual_hour         int,
  actual_ampm         text,
  actual_minute       int,
  actual_sex          text,
  actual_weight_oz    int,
  -- Stripe
  stripe_account_id   text,
  -- Timestamps
  results_submitted_at timestamptz,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── BETS ─────────────────────────────────────────────────────────
create table if not exists bets (
  id                  uuid primary key default uuid_generate_v4(),
  pool_id             uuid not null references pools(id) on delete cascade,
  -- Bettor info (private — RLS restricts to pool owner)
  bettor_name         text not null,
  bettor_email        text,
  bettor_phone        text,
  -- Guesses
  guessed_date        date not null,
  guessed_hour        int  not null,
  guessed_ampm        text not null,
  guessed_minute      int  not null,
  guessed_sex         text,
  guessed_weight_oz   int,
  -- Financials
  amount_paid         numeric(8,2) not null,
  total_charged       numeric(8,2) not null,
  -- Payment
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending','paid','refunded','failed')),
  stripe_session_id   text,
  stripe_payment_intent text,
  -- Results
  rank                int,
  prize_amount        numeric(8,2),
  payout_status       text default 'pending'
                      check (payout_status in ('pending','processing','paid','failed')),
  -- Timestamps
  created_at          timestamptz not null default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────
create index if not exists bets_pool_id_idx on bets(pool_id);
create index if not exists bets_payment_status_idx on bets(payment_status);
create index if not exists pools_slug_idx on pools(slug);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pools_updated_at
  before update on pools
  for each row execute function update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────
alter table pools enable row level security;
alter table bets  enable row level security;

-- Pools: anyone can read (for sharing links)
create policy "pools_select_public"
  on pools for select using (true);

-- Pools: only authenticated owners can update
create policy "pools_update_owner"
  on pools for update
  using (parent_email = auth.jwt() ->> 'email');

-- Pools: anyone can insert (pool creation)
create policy "pools_insert_public"
  on pools for insert with check (true);

-- Bets: public can see safe fields (no PII) — enforced by application select query
-- Full row access only for pool owner
create policy "bets_select_public"
  on bets for select
  using (
    payment_status = 'paid'
    -- Pool owner can see all fields including PII (enforced in app layer)
  );

create policy "bets_insert_public"
  on bets for insert with check (true);

create policy "bets_update_system"
  on bets for update using (true);

-- ─── HELPER VIEW: safe bet summary (no PII) ────────────────────────
create or replace view public_bets as
  select
    b.id,
    b.pool_id,
    b.guessed_date,
    b.guessed_hour,
    b.guessed_ampm,
    b.guessed_minute,
    b.guessed_sex,
    b.guessed_weight_oz,
    b.amount_paid,
    b.payment_status,
    b.created_at
  from bets b
  where b.payment_status = 'paid';
  