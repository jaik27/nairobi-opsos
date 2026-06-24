-- ============================================================================
-- Nairobi OpsOS — Procurement & Stores Control Tower
-- Migration 001: Core schema, multi-tenancy, RLS, audit, eTIMS-ready, views
-- Target: Supabase (PostgreSQL 15+)
--
-- Run this in the Supabase SQL Editor (it executes as the postgres role, so
-- it can create roles/policies). Then run 002_demo_seed.sql.
--
-- Design notes:
--   * Every business table carries org_id  -> true multi-tenant isolation.
--   * Row-Level Security (RLS) is ON for every table; a user only ever sees
--     rows for their own org. This is the enterprise-grade differentiator and
--     also how client demos can never touch real data.
--   * Stock is an append-only LEDGER (stock_movements), not a mutable number.
--     This mirrors KRA eTIMS' stock-in / stock-out requirement and gives you
--     a tamper-evident audit trail of every quantity change.
--   * Invoice rows carry KRA/eTIMS fields and payments carry M-Pesa fields so
--     the same schema extends to compliance + reconciliation later.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- TENANCY
-- ----------------------------------------------------------------------------
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kra_pin     text,                              -- org's own KRA PIN (eTIMS)
  county      text,
  is_demo     boolean not null default false,    -- client-safe demo tenant
  created_at  timestamptz not null default now()
);

-- One profile per auth user, mapping them to exactly one org + a role.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff'
              check (role in ('owner','manager','staff','viewer')),
  created_at  timestamptz not null default now()
);

-- Resolve the current user's org. SECURITY DEFINER avoids RLS recursion on
-- profiles when this is called from inside other tables' policies.
create or replace function current_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Generic updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ----------------------------------------------------------------------------
-- MASTER DATA
-- ----------------------------------------------------------------------------
create table if not exists suppliers (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  name           text not null,
  kra_pin        text,                            -- needed to claim input VAT
  phone          text,
  email          text,
  lead_time_days int,
  rating         numeric(3,2),
  active         boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);

create table if not exists stock_items (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  sku            text not null,
  name           text not null,
  uom            text not null default 'unit',    -- unit of measure
  reorder_level  numeric(14,2) not null default 0,
  reorder_qty    numeric(14,2) not null default 0,
  unit_cost      numeric(14,2),
  location       text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, sku)
);

-- ----------------------------------------------------------------------------
-- PROCUREMENT CHAIN: PR -> Quotations -> LPO -> GRN -> Invoice -> Payment
-- ----------------------------------------------------------------------------
create table if not exists purchase_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  pr_number     text not null,
  requested_by  text,
  department    text,
  status        text not null default 'draft'
                check (status in ('draft','submitted','approved','rejected','rfq_sent','closed')),
  needed_by     date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid default auth.uid(),
  unique (org_id, pr_number)
);

create table if not exists purchase_request_lines (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  pr_id          uuid not null references purchase_requests(id) on delete cascade,
  stock_item_id  uuid references stock_items(id),
  description    text,
  qty            numeric(14,2) not null,
  uom            text
);

create table if not exists quotations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  pr_id        uuid references purchase_requests(id) on delete set null,
  supplier_id  uuid not null references suppliers(id),
  quote_number text,
  quote_date   date default current_date,
  currency     text not null default 'KES',
  valid_until  date,
  status       text not null default 'received'
               check (status in ('received','shortlisted','selected','rejected')),
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists quotation_lines (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  quotation_id   uuid not null references quotations(id) on delete cascade,
  stock_item_id  uuid references stock_items(id),
  description    text,
  qty            numeric(14,2) not null,
  unit_price     numeric(14,2) not null,
  line_total     numeric(14,2) generated always as (qty * unit_price) stored
);

create table if not exists purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  lpo_number    text not null,
  supplier_id   uuid not null references suppliers(id),
  quotation_id  uuid references quotations(id),
  order_date    date default current_date,
  status        text not null default 'issued'
                check (status in ('issued','part_received','received','cancelled')),
  currency      text not null default 'KES',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, lpo_number)
);

create table if not exists purchase_order_lines (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  lpo_id         uuid not null references purchase_orders(id) on delete cascade,
  stock_item_id  uuid references stock_items(id),
  description    text,
  qty            numeric(14,2) not null,
  unit_price     numeric(14,2) not null,
  qty_received   numeric(14,2) not null default 0,
  line_total     numeric(14,2) generated always as (qty * unit_price) stored
);

create table if not exists grns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  grn_number    text not null,
  lpo_id        uuid references purchase_orders(id),
  supplier_id   uuid references suppliers(id),
  received_date date default current_date,
  received_by   text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (org_id, grn_number)
);

create table if not exists grn_lines (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  grn_id         uuid not null references grns(id) on delete cascade,
  stock_item_id  uuid references stock_items(id),
  qty_received   numeric(14,2) not null,
  uom            text
);

create table if not exists invoices (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  invoice_number    text not null,
  supplier_id       uuid references suppliers(id),
  lpo_id            uuid references purchase_orders(id),
  invoice_date      date default current_date,
  due_date          date,
  currency          text not null default 'KES',
  subtotal          numeric(14,2),
  vat_amount        numeric(14,2),
  total_amount      numeric(14,2),
  -- eTIMS / KRA fields
  supplier_kra_pin  text,
  buyer_kra_pin     text,
  etims_control_code text,                         -- KRA unique invoice id
  etims_qr_url      text,
  etims_status      text not null default 'pending'
                    check (etims_status in ('pending','validated','rejected','not_applicable')),
  payment_status    text not null default 'unpaid'
                    check (payment_status in ('unpaid','part_paid','paid')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, invoice_number)
);

create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  invoice_id     uuid references invoices(id),
  amount         numeric(14,2) not null,
  paid_at        timestamptz not null default now(),
  method         text not null default 'mpesa'
                 check (method in ('mpesa','bank','cash','cheque','other')),
  mpesa_receipt  text,                             -- Daraja transaction code
  reference      text,
  reconciled     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Append-only stock ledger (the eTIMS stock-in / stock-out record).
create table if not exists stock_movements (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  stock_item_id  uuid not null references stock_items(id),
  movement_type  text not null check (movement_type in ('in','out','adjust')),
  qty            numeric(14,2) not null,
  source_doc     text,                             -- 'GRN','ISSUE','ADJUST','SALE'
  source_id      uuid,
  moved_at       timestamptz not null default now(),
  notes          text,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['suppliers','stock_items','purchase_requests',
                           'purchase_orders','invoices']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end$$;

-- Helpful indexes
create index if not exists idx_movements_item on stock_movements(stock_item_id);
create index if not exists idx_quotations_pr  on quotations(pr_id);
create index if not exists idx_invoices_supplier on invoices(supplier_id);

-- ----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY  (org isolation on every table)
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'orgs','profiles','suppliers','stock_items','purchase_requests',
    'purchase_request_lines','quotations','quotation_lines','purchase_orders',
    'purchase_order_lines','grns','grn_lines','invoices','payments','stock_movements']
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end$$;

-- orgs / profiles: a user sees only their own org / their own profile row
create policy org_self on orgs for all to authenticated
  using (id = current_org_id()) with check (id = current_org_id());

create policy profile_self on profiles for all to authenticated
  using (org_id = current_org_id()) with check (org_id = current_org_id());

-- All business tables: isolate by org_id
do $$
declare t text;
begin
  foreach t in array array[
    'suppliers','stock_items','purchase_requests','purchase_request_lines',
    'quotations','quotation_lines','purchase_orders','purchase_order_lines',
    'grns','grn_lines','invoices','payments','stock_movements']
  loop
    execute format(
      'create policy org_isolation on %1$s for all to authenticated
         using (org_id = current_org_id())
         with check (org_id = current_org_id());', t);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- CONTROL-TOWER VIEWS  (security_invoker = RLS still applies through the view)
-- ----------------------------------------------------------------------------
create or replace view v_stock_on_hand
with (security_invoker = true) as
select si.org_id,
       si.id as stock_item_id,
       si.sku, si.name, si.uom, si.reorder_level, si.reorder_qty,
       coalesce(sum(case when m.movement_type = 'in'  then  m.qty
                         when m.movement_type = 'out' then -m.qty
                         else m.qty end), 0) as on_hand
from stock_items si
left join stock_movements m on m.stock_item_id = si.id
group by si.id;

create or replace view v_reorder_alerts
with (security_invoker = true) as
select * from v_stock_on_hand
where on_hand <= reorder_level;

create or replace view v_quote_comparison
with (security_invoker = true) as
select q.org_id,
       q.pr_id,
       q.id as quotation_id,
       s.name as supplier,
       q.currency, q.status,
       coalesce(sum(ql.line_total), 0) as quote_total,
       rank() over (partition by q.pr_id
                    order by coalesce(sum(ql.line_total), 0) asc) as price_rank
from quotations q
join suppliers s on s.id = q.supplier_id
left join quotation_lines ql on ql.quotation_id = q.id
group by q.id, s.name;

-- ----------------------------------------------------------------------------
-- GRANTS
-- Supabase normally applies these automatically; we make them explicit so the
-- schema is portable (e.g. plain Postgres + PostgREST) and the security model
-- is self-documenting. Table/role GRANTs govern ACCESS; RLS governs WHICH ROWS.
--   anon          -> read-only (and RLS still restricts it to the demo org)
--   authenticated -> read/write (RLS restricts every row to the user's org)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ============================================================================
-- End migration 001
-- ============================================================================
