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

## Current state (updated 2026-06-30)
**Deployed and live at https://nairobi-opsos.pages.dev** (Cloudflare Pages,
git-connected to `main`). Migrations 001–005 are applied to the production
Supabase project. The Supabase Auth redirect URL is configured for the
production domain, so the magic-link round trip works post-deploy, not just
on localhost.

Real Supabase Auth (magic link) is live and committed, additive alongside the
anon demo path — 002/004's anon policies untouched. Migration 005_align_roles.sql
aligned profiles.role to the IA §9 roles (owner/procurement/finance/viewer,
default 'viewer'). Both lanes are verified live end-to-end, including the
authenticated round trip itself: anon demo (Mission Control, Stores,
Procurement all unchanged, zero console errors) and a real sign-in → a
provisioned profile/org → a Purchase Request created and confirmed under the
real org id, isolated from the demo org in both directions (checked from an
incognito session). See src/hooks/useSession.ts, src/lib/auth.ts,
src/screens/SignIn.tsx, src/components/AuthStatus.tsx, and the explicit
org_id branch in Procurement.tsx's handleCreate (src/lib/userOrg.ts vs
src/lib/demoOrg.ts). Provisioning is still manual (one orgs + one profiles
row via SQL Editor); no signup-creates-org trigger yet — one real user today.

**Record-keeping note:** this operational state (deployment, the live auth
round trip, applied migrations, dashboard config) lives in Cloudflare,
Supabase, and the browser — it leaves no artifact in the repo itself, so a
repo-only read (e.g. `docs/PROJECT_AUDIT.md`) is structurally blind to it.
See `docs/STATE_OF_THE_VENTURE.md` for the fuller venture-level picture,
including the gap between this product foundation and the unstarted go-to-
market track.

## Next step
PR approval workflow (submit → approve/reject-with-comment), now that real
roles/identities exist — per docs/control-tower-gap-analysis.md §4. Uses the
existing draft/submitted/approved/rejected/rfq_sent/closed states; the states
exist, the transitions don't. Add a PR detail view + status tabs alongside it.

## After that
Stock movements (receive/issue/adjust + item history) to make Stores a real
inventory tool. Then the Stores→PR "reorder now" bridge + Mission Control
click-through tiles. Then continue the chain: Quotations → PO → GRN → Invoice →
payment/3-way match. Port Command Station UX (reference only — port FROM, don't
paste IN) opportunistically, not as a blocking step. Then an n8n nightly
reorder-alert digest (see SETUP_RUNBOOK.md §5).
