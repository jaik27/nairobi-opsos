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

## Current state (updated 2026-06-29)
Real Supabase Auth is live, additive alongside the anon demo path (neither 002's
nor 004's anon policies were touched). Migration 005_align_roles.sql aligned
profiles.role to the IA §9 roles (owner/procurement/finance/viewer, default
'viewer') — profiles had zero rows, so this was a clean rename, not a data
migration. Front end: src/hooks/useSession.ts tracks the session; src/lib/auth.ts
(signInWithMagicLink/signOut); src/screens/SignIn.tsx is a minimal magic-link
form; src/components/AuthStatus.tsx is the sign-in/out control shown above every
screen's content. Mission Control and Stores needed zero changes — RLS already
scopes reads correctly per role. The one deliberate branch is in
Procurement.tsx's handleCreate: org_id comes from src/lib/userOrg.ts's
getOwnOrgId(session.user.id) when signed in, else demoOrg.ts's getDemoOrgId() —
createPurchaseRequest no longer resolves org_id itself, it's an explicit param.
Verified live: anon lane fully regression-checked (Mission Control, Stores,
Procurement's demo data all unchanged, zero console errors); the authenticated
lane's plumbing is verified by code/RLS review but needs a human to actually
click a magic link from their inbox to confirm end-to-end — provisioning is
manual (one orgs row + one profiles row per real user via SQL Editor), no
signup-creates-org trigger yet (deliberately deferred — one real user today).

## Next step
Per docs/control-tower-gap-analysis.md §4's recommended order, now that identity
exists: build the PR approval workflow (submit → approve/reject-with-comment,
using the existing draft/submitted/approved/rejected/rfq_sent/closed states —
the states exist, the transitions don't) + a PR detail view + status tabs. Don't
jump ahead to Stock movements or the Quotations/PO/Invoice chain before this.

## After that
Stock movements (receive/issue/adjust + item history) to make Stores a real
inventory tool. Then the Stores→PR "reorder now" bridge + Mission Control
click-through tiles. Then continue the chain: Quotations → PO → GRN → Invoice →
payment/3-way match. Port Command Station UX (reference only — port FROM, don't
paste IN) opportunistically, not as a blocking step. Then an n8n nightly
reorder-alert digest (see SETUP_RUNBOOK.md §5).
