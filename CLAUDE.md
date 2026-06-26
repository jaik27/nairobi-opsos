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

## Current state (updated 2026-06-26)
Three screens live on Supabase: Mission Control, Stores (search + sort over
stock_items/v_stock_on_hand), and now Procurement → Purchase Requests. Migration
004_demo_write_policies.sql adds narrow anon INSERT policies (demo org only,
same is_demo fence as 002's reads) on purchase_requests + purchase_request_lines
— apps/web's first real write-path. src/data/purchaseRequests.ts fetches PRs with
an embedded line count and creates a PR (status defaults 'draft') then its lines
in two inserts; src/lib/demoOrg.ts looks up the demo org id rather than hardcoding
it. Procurement screen = list + create form (stock-item picker or free-text line),
list refreshes after a successful create. Verified live: existing seed PR-2026-001
reads correctly; created a PR with one stock-item line + one free-text line,
confirmed in the DB (org_id correctly fenced to the demo org), zero console errors.
pr_number is a client-side timestamp — a known demo shortcut, not final numbering,
to revisit once real PR numbering is designed.

## Next step
Pick one (don't widen scope by doing all three): (a) deploy apps/web to Cloudflare
Pages (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as build env vars); (b) build the
Invoices slice; (c) replace migration 004's anon-write demo sandbox with real
Supabase Auth (see 004's header comment) before any real tenant data exists.

## After that
Port UX patterns from the old Apps Script Command Station (reference only — port
FROM, don't paste IN). Then n8n nightly reorder-alert digest (see SETUP_RUNBOOK.md §5).
