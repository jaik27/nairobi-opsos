-- ============================================================================
-- Nairobi OpsOS — Procurement & Stores Control Tower
-- Migration 005: Align profiles.role to the IA's four roles
--
-- Run AFTER 001_procurement_core.sql (and, for a working demo, 002/004), in the
-- Supabase SQL Editor.
--
-- WHY
-- 001 created profiles.role with check (role in ('owner','manager','staff',
-- 'viewer')). docs/04_Information_Architecture.md §9 defines this app's actual
-- permission model as four different roles — Owner, Procurement, Finance,
-- Viewer — with a Procurement/Finance split the old labels never carried
-- (Raise PR / Record GRN gated to Owner+Procurement; Capture invoice / Record
-- payment gated to Owner+Finance). Nothing reads profiles.role yet — there is
-- no auth UI before this migration — and the table has zero rows (002's demo
-- seed never inserts a profile), so this is a safe, zero-data-impact rename.
--
-- The column default ('staff') is updated too: leaving it unchanged would make
-- any future insert that omits `role` violate the new check constraint.
-- ============================================================================

alter table profiles drop constraint profiles_role_check;

alter table profiles add constraint profiles_role_check
  check (role in ('owner','procurement','finance','viewer'));

alter table profiles alter column role set default 'viewer';

-- ============================================================================
-- End migration 005
-- ============================================================================
