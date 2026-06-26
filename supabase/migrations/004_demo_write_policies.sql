-- ============================================================================
-- Nairobi OpsOS — Procurement & Stores Control Tower
-- Migration 004: DEMO-ONLY anon write sandbox for Purchase Requests
--
-- Run AFTER 001_procurement_core.sql and 002_demo_seed.sql, in the Supabase
-- SQL Editor. (003_command_core.sql is a separate, reference-only draft for
-- the future Command layer — unrelated to this migration, do not run it yet.)
--
-- WHY THIS EXISTS
-- apps/web has no login screen yet and only ever uses the anon key. 001 grants
-- anon zero write access (org_isolation is "for all to authenticated" only),
-- and 002 only added anon READ policies. To let the Procurement → Purchase
-- Requests screen create real rows before real Auth exists, this migration
-- opens a narrow anon INSERT path — fenced to the demo org using the exact
-- same `is_demo = true` lookup 002 already uses for reads. Anon can create
-- rows ONLY inside the sandbox demo org; it can never see or touch any other
-- org's data, because every other policy (org_isolation, and the absence of
-- any other anon grant) still applies.
--
-- *** THIS IS A DEMO-ONLY SANDBOX POLICY. ***
-- It exists so a logged-out visitor can try the product against safe, throwaway
-- demo data. It must be REPLACED by real Supabase Auth (sign-in, profiles,
-- current_org_id()) before any real tenant's data ever lands in this schema.
-- Do not extend this anon-write pattern to other tables "for convenience" —
-- each additional anon-write grant is additional blast radius on the one
-- tenant (the demo org) anon can reach. Treat this migration as temporary.
-- ============================================================================

create policy demo_write_purchase_requests
  on purchase_requests
  for insert
  to anon
  with check (org_id in (select id from orgs where is_demo = true));

create policy demo_write_purchase_request_lines
  on purchase_request_lines
  for insert
  to anon
  with check (org_id in (select id from orgs where is_demo = true));

-- ============================================================================
-- End migration 004
-- ============================================================================
