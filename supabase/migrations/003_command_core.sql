-- ============================================================================
-- 003_command_core.sql  —  COMMAND domain (founder/BD layer)  —  DRAFT
-- ============================================================================
-- STATUS: DRAFT / REFERENCE ONLY. DO NOT RUN YET.
--
-- This migration creates the COMMAND (founder/BD) half of the unified OpsOS:
-- Jay's prospecting, intel, tasks, pipeline, build log, and search memory.
-- It is NOT part of the Control Tower (client ops, built in 001/002).
--
-- DO NOT RUN until:
--   1. The Control Tower vertical (Stores -> Procurement) is finished, AND
--   2. Column names below are VERIFIED against the real Google Sheet headers.
--      Every field marked  -- ⚠ inferred  was guessed from how the v0.5.1
--      Apps Script reads the sheets, not from confirmed headers.
--
-- SECURITY MODEL (non-negotiable):
--   COMMAND tables are FOUNDER-ONLY. They live in their own schema (`command`)
--   so client/tenant roles (anon, authenticated) can never see a single BD row.
--   Control Tower tables stay in `public` with per-tenant RLS (001). The two
--   domains share one database but never cross.
-- ============================================================================

create schema if not exists command;

-- Lock the schema down: client-facing roles get NOTHING here.
revoke all on schema command from anon, authenticated;
-- (Grant access to a dedicated founder role you create in Supabase, e.g. `founder`.)
-- create role founder;  -- do this once in the dashboard / a setup migration
grant usage on schema command to founder;

-- ---------------------------------------------------------------------------
-- prospects
-- ---------------------------------------------------------------------------
create table command.prospects (
  id                uuid primary key default gen_random_uuid(),
  company_name      text not null,                 -- ⚠ inferred ('Company Name')
  sector            text,                           -- ⚠ inferred ('Sector')
  location          text,                           -- ⚠ inferred ('Location')
  fit_score         integer,                        -- ⚠ inferred ('Fit Score')
  likely_pain_point text,                           -- ⚠ inferred ('Likely Pain Point')
  status            text default 'new',             -- new/contacted/qualified/dropped
  notes             text,
  source            text,                           -- e.g. 'Scout: Distribution', 'manual'
  source_key        text,                           -- for idempotent re-import / dedupe
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- daily_intelligence
-- ---------------------------------------------------------------------------
create table command.daily_intelligence (
  id                uuid primary key default gen_random_uuid(),
  segment           text,                           -- ⚠ inferred ('Segment')
  recommendation    text not null,                  -- ⚠ inferred ('Recommendation')
  why_today         text,                           -- ⚠ inferred ('Why Today')
  novelty_status    text,                           -- new/duplicate/stale/refinement/follow-up/skip
  priority          text default 'medium',          -- high/medium/low
  suggested_command text,                           -- ⚠ inferred ('Suggested Command')
  approval_required boolean default true,
  expected_output   text,
  created_at        timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table command.tasks (
  id            uuid primary key default gen_random_uuid(),
  task          text not null,                       -- ⚠ inferred ('Task')
  priority      text default 'medium',               -- ⚠ inferred ('Priority')
  status        text default 'open',                 -- open/in_progress/done/blocked
  notes         text,                                -- ⚠ inferred ('Notes')
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- build_log
-- ---------------------------------------------------------------------------
create table command.build_log (
  id          uuid primary key default gen_random_uuid(),
  build_item  text not null,                         -- ⚠ inferred ('Build Item')
  status      text default 'planned',                -- planned/in_progress/done
  notes       text,                                  -- ⚠ inferred ('Notes')
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- pipeline  (the 'Revenue' sheet)
-- ---------------------------------------------------------------------------
create table command.pipeline (
  id              uuid primary key default gen_random_uuid(),
  opportunity     text not null,                     -- ⚠ inferred ('Opportunity')
  stage           text default 'lead',               -- lead/warm/proposal/won/lost
  status          text,                              -- ⚠ inferred ('Status')
  value_estimate  numeric,                           -- KES
  next_action     text,
  notes           text,                              -- ⚠ inferred ('Notes')
  prospect_id     uuid references command.prospects(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- search_history  (the dedupe/memory backbone)
-- ---------------------------------------------------------------------------
create table command.search_history (
  id              uuid primary key default gen_random_uuid(),
  search_id       text,                              -- ⚠ inferred ('Search ID')
  searched_at     timestamptz default now(),         -- ⚠ inferred ('Date')
  segment         text,                              -- ⚠ inferred ('Segment')
  search_theme    text,                              -- ⚠ inferred ('Search Theme')
  query_command   text,                              -- ⚠ inferred ('Query / Command')
  source_type     text,                              -- ⚠ inferred ('Source Type')
  reason          text,                              -- ⚠ inferred ('Reason for Search')
  result_summary  text,                              -- ⚠ inferred ('Result Summary')
  novelty_status  text,                              -- ⚠ inferred ('Novelty Status')
  status          text default 'logged'              -- ⚠ inferred ('Status')
);

-- ---------------------------------------------------------------------------
-- RLS — founder-only on every COMMAND table
-- ---------------------------------------------------------------------------
alter table command.prospects          enable row level security;
alter table command.daily_intelligence enable row level security;
alter table command.tasks              enable row level security;
alter table command.build_log          enable row level security;
alter table command.pipeline           enable row level security;
alter table command.search_history     enable row level security;

-- Grant table access to the founder role only (NOT anon/authenticated).
grant select, insert, update, delete on all tables in schema command to founder;

-- Example policy pattern (repeat per table): only the founder role sees rows.
-- Adjust to your actual auth setup (founder role, or a fixed founder user id).
create policy founder_all on command.prospects
  for all to founder using (true) with check (true);
create policy founder_all on command.daily_intelligence
  for all to founder using (true) with check (true);
create policy founder_all on command.tasks
  for all to founder using (true) with check (true);
create policy founder_all on command.build_log
  for all to founder using (true) with check (true);
create policy founder_all on command.pipeline
  for all to founder using (true) with check (true);
create policy founder_all on command.search_history
  for all to founder using (true) with check (true);

-- ============================================================================
-- OPEN DECISION (resolve before running):
--   Is the COMMAND layer single-founder forever, or eventual team?
--   This draft assumes SINGLE FOUNDER (simplest). If a team is ever in scope,
--   add an owner_id/user scoping column + per-user policies before going live.
-- ============================================================================
-- End draft migration 003
-- ============================================================================
