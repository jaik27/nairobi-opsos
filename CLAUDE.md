# CLAUDE.md — Nairobi OpsOS

Read this first, every session. Then read `/docs` for full context
(start with `03_Technical_Design_RFC.md` and `04_Information_Architecture.md`).
For the lived history — decisions, working style, the Command Station vs Control
Tower distinction, and the Drive artifact map — read docs/CONTEXT_PACK.md.

Command (founder/BD) layer is planned but NOT started. Its porting spec is
docs/command-station-v0.5.1-analysis.md and a DRAFT schema is
supabase/migrations/003_command_core.sql — both are REFERENCE ONLY, do not
build/run until the Control Tower vertical (Stores → Procurement) is done.
Product direction is to UNIFY Command + Control Tower as two scopes of one
platform — that's future sequencing, not the active task; see
docs/CONTEXT_PACK.md for the full decision.

## What this is
Nairobi OpsOS — a consulting-led digital operations & AI automation platform for
Kenyan SMEs. First module: the **Procurement & Stores Control Tower** for the
manufacturing/distribution segment. HAL (an aluminium manufacturer) is a **reference
specimen**, not the customer.

## Stack (decided — do not re-litigate)
- **Data / source of truth:** Supabase (Postgres + Row-Level Security).
- **App:** Vite + React + TypeScript PWA in `apps/web` (dark "cockpit" UI).
- **Automation:** n8n (self-hosted) — later.
- **Runtime AI:** Gemini API (free tier) — later.
- **Deploy:** Cloudflare Pages (git-connected). NOT Netlify/Vercel.
- **Build loop:** Claude Code. Conventional Commits, trunk-based, small PRs.

## Repo layout
```
apps/web/            Vite + React + TS PWA (the cockpit)
supabase/migrations/ SQL migrations (001_procurement_core.sql is the schema)
docs/                Phase-1 docs (charter, PRD, RFC, IA, risk, etc.)
CLAUDE.md            this file
```

## Design tokens (cockpit)
Near-black canvas `#05070A`; accents lime `#A8FF4F` + cyan `#59F1FF`; text `#F4F8FB`;
font Inter; rounded 22px panels; mobile-first. (Full system in the RFC/IA.)

## Non-negotiable rules
- **No table without RLS.** Every Supabase table has Row-Level Security enabled.
- **Keys:** anon key client-side only; service-role key server-side only; never in git.
- **Secrets:** `.env` is local-only and git-ignored. Never commit credentials.
- **AI drafts; a human approves.** Any external action or data import is confirmed by
  a human. Never auto-merge imported records.
- **Integration-first:** build around existing tools (adapter library over a shared
  ingestion core); never rip-and-replace.
- **TypeScript strict; functional components; named exports; keep components small.**
- **Scope discipline:** ship one vertical end-to-end before widening. Don't gold-plate.

## Current state (updated 2026-07-01)
**Deployed and live at https://nairobi-opsos.pages.dev** (Cloudflare Pages,
git-connected to `main`). Migrations 001–006 applied to the production Supabase
project. Auth redirect URL configured for production.

PR approval workflow is live and verified end-to-end:
- **Happy path:** submit → approve/reject-with-comment; each transition writes
  an append-only row to `purchase_request_status_history`; detail view shows
  lines, metadata, action buttons, and the full history timeline.
- **Security path:** viewer role blocked at the REST API — a direct
  `PATCH /purchase_requests?id=eq.<id>` with a viewer JWT returns `[]`
  (0 rows affected); the database status is unchanged.
- Role gate lives in the `pr_approve_reject` RLS policy (`pr_approve_reject`
  requires `current_user_role() in ('owner','procurement')`), not just the UI.

Both auth lanes remain live: anon demo (Mission Control, Stores, Procurement
reads + PR create into demo org) and authenticated org-scoped access. Provisioning
is still manual.

**Record-keeping note:** deployment and applied-migration state leave no repo
artifact — see `docs/STATE_OF_THE_VENTURE.md`.

## Next step
**Pick at the start of the next session:**
- **Stock movements** (receive / issue / adjust + per-item history) — makes
  Stores a real inventory tool. Schema already built (`stock_movements` ledger,
  `v_stock_on_hand`); missing the write path and history screen.
- **Production-auth polish** — seed realistic suppliers/stock-items for the real
  org so demos use the owner's own data, not just the anon plastics demo.

## After that
Stores→PR "reorder now" bridge + Mission Control click-through tiles. Then
continue the chain: Quotations → PO → GRN → Invoice → payment/3-way match.
Port Command Station UX opportunistically (reference only — port FROM, don't
paste IN). Then n8n nightly reorder-alert digest (see SETUP_RUNBOOK.md §5).

## Known technical debt (agent: note these)
- **BEFORE UPDATE trigger (006 — deferred):** The two split UPDATE policies on
  `purchase_requests` (`pr_submit` + `pr_approve_reject`) can be combined by
  Postgres's OR-of-policies semantics so an `owner`/`procurement` user can jump
  directly `draft → approved`, bypassing `submitted`. The security boundary
  (viewer can't approve) still holds — only privileged roles are affected. The
  correct fix is a `BEFORE UPDATE` trigger (sees OLD and NEW unambiguously),
  replacing the two policies with one coarse org-isolation UPDATE policy + a
  trigger for transition enforcement. Accepted at single-user scale; fix before
  multi-user rollout.
- **Real org needs realistic seed data:** The authenticated lane currently writes
  to an empty org (no suppliers, no stock items, no movements). The approval
  workflow and all future screens will be meaningless in a demo until the real
  org has a realistic set of seeded records — suppliers, stock items, initial
  movements. Do this before any client demo.
- **Two-step writes (no DB transaction):** Both `createPurchaseRequest` and
  `updatePurchaseRequestStatus` do two sequential HTTP requests with no shared
  transaction. Partial failure leaves orphaned rows. Fix: wrap in a DB-side RPC
  for true atomicity.
- **No `supabase gen types`:** All Supabase row types are hand-written `as`
  casts. Schema drift is silent at build time.
- **No CI pipeline:** No `.github/` directory exists. All tests are manual.
- Full debt inventory in `docs/PROJECT_AUDIT.md` §8.
