# CLAUDE.md — Nairobi OpsOS

Read this first, every session. Then read `/docs` for full context
(start with `03_Technical_Design_RFC.md` and `04_Information_Architecture.md`).

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

## Current state (updated 2026-06-24)
Walking skeleton DONE. apps/web runs locally (`npm run dev`) — dark cockpit shell,
Mission Control screen reading 8 mock stock items from src/data/stockItems.ts
(typed to mirror stock_items / v_stock_on_hand). Repo published to GitHub:
jaik27/nairobi-opsos, committed on main.

## Next step
Wire Supabase: stand up the project, push supabase/migrations/001_procurement_core.sql,
then swap the mock array in src/data/stockItems.ts for a live stock_items read.
Mock fields already match the schema, so this is a drop-in swap.

## After that
Build one screen end-to-end with live data, then port UX patterns from the old
Apps Script Command Station (reference only — port FROM, don't paste IN).
