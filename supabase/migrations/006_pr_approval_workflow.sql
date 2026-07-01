-- ============================================================================
-- Nairobi OpsOS — PR Approval Workflow
-- Migration 006: status-history audit trail + role-gated status transitions
-- on purchase_requests.
--
-- Design notes:
--   * purchase_requests already has a status check constraint (draft/submitted/
--     approved/rejected/rfq_sent/closed, from 001) but nothing enforced which
--     transitions between those values are legal, or who could make them — any
--     authenticated org member could already UPDATE any column via 001's
--     blanket `org_isolation for all` policy. This migration replaces that
--     blanket UPDATE behavior with two narrower, transition-specific policies.
--   * KNOWN LIMITATION (flagging, not silently fixing): Postgres combines
--     multiple permissive policies for the same command by OR-ing their USING
--     clauses together, and separately OR-ing their WITH CHECK clauses
--     together — the pairing between a policy's own USING and its own WITH
--     CHECK is NOT preserved across policies. Practical effect here: an
--     owner/procurement user COULD update a 'draft' PR straight to 'approved'
--     in one call, skipping 'submitted' — pr_submit's USING (status='draft')
--     makes the row targetable, and pr_approve_reject's WITH CHECK (new status
--     approved/rejected + role check) accepts the result, even though neither
--     policy's own pair describes that exact transition. This does NOT let an
--     unauthorized role (e.g. viewer) approve anything — every WITH CHECK that
--     can produce 'approved'/'rejected' still requires
--     current_user_role() in ('owner','procurement') — so the actual security
--     boundary (who can approve) holds. It only means owner/procurement can
--     skip the submit step, which is a workflow-integrity nicety, not a
--     security hole. If that's not acceptable, the correct fix is a BEFORE
--     UPDATE trigger (which sees OLD and NEW unambiguously) instead of two
--     separate RLS policies — flag it back and I'll redo it that way.
-- ============================================================================

-- Resolve the current user's role. Mirrors current_org_id(): SECURITY DEFINER
-- avoids RLS recursion on profiles when this is called from another table's
-- policy (profiles has its own RLS via profile_self).
create or replace function current_user_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- Append-only audit trail: every PR status change, who made it, when, and any
-- comment (the reject-with-comment / resubmit / approve narrative).
-- ----------------------------------------------------------------------------
create table if not exists purchase_request_status_history (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  pr_id        uuid not null references purchase_requests(id) on delete cascade,
  from_status  text not null,
  to_status    text not null,
  comment      text,
  changed_by   uuid default auth.uid(),
  changed_at   timestamptz not null default now()
);

create index if not exists idx_pr_status_history_pr on purchase_request_status_history(pr_id);

alter table purchase_request_status_history enable row level security;

-- Same org-isolation shape as every other table: a signed-in user only ever
-- sees/writes history rows for their own org.
create policy org_isolation on purchase_request_status_history for all to authenticated
  using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- Read-only demo-lane visibility, for consistency with every other table's
-- 002 demo_read policy — this is SELECT only, no new write surface for anon.
create policy demo_read on purchase_request_status_history for select to anon
  using (org_id in (select id from orgs where is_demo = true));

-- Explicit grants (001's blanket "all tables in schema public" grants only
-- applied to tables that existed when 001 ran — this table is new). Kept
-- append-only on purpose: authenticated gets select+insert, never
-- update/delete, so even a bug or a direct API call can't rewrite history.
grant select on purchase_request_status_history to anon, authenticated;
grant insert on purchase_request_status_history to authenticated;

-- ----------------------------------------------------------------------------
-- purchase_requests: split the blanket org_isolation "for all" policy so
-- UPDATE gets its own, transition-specific rules. select/insert/delete keep
-- the exact same effective behavior as before.
-- ----------------------------------------------------------------------------
drop policy if exists org_isolation on purchase_requests;

create policy org_isolation_select on purchase_requests for select to authenticated
  using (org_id = current_org_id());

create policy org_isolation_insert on purchase_requests for insert to authenticated
  with check (org_id = current_org_id());

create policy org_isolation_delete on purchase_requests for delete to authenticated
  using (org_id = current_org_id());

-- UPDATE rule 1: draft -> submitted. Any authenticated org member may do
-- this (not restricted to the original creator — the column created_by isn't
-- checked here; flag back if you want it creator-only).
create policy pr_submit on purchase_requests for update to authenticated
  using (org_id = current_org_id() and status = 'draft')
  with check (org_id = current_org_id() and status = 'submitted');

-- UPDATE rule 2: submitted -> approved / submitted -> rejected. Only
-- owner/procurement — enforced here, server-side, not just hidden in the UI.
create policy pr_approve_reject on purchase_requests for update to authenticated
  using (
    org_id = current_org_id()
    and status = 'submitted'
    and current_user_role() in ('owner', 'procurement')
  )
  with check (
    org_id = current_org_id()
    and status in ('approved', 'rejected')
    and current_user_role() in ('owner', 'procurement')
  );

-- Note: the anon demo-write lane (004) only ever granted INSERT on
-- purchase_requests, scoped to the demo org. It has no UPDATE policy before
-- or after this migration, so anon-created demo PRs simply stay in 'draft'
-- forever — approval requires a real authenticated identity, by design.

-- ============================================================================
-- End migration 006
-- ============================================================================
