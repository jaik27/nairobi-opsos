# Nairobi OpsOS

Consulting-led digital operations & AI automation platform for Kenyan SMEs.
First module: **Procurement & Stores Control Tower**.

## Layout
- `apps/web/` — Vite + React + TypeScript PWA (the cockpit). *Scaffolded by Claude Code.*
- `supabase/migrations/` — Postgres schema (RLS). `001_procurement_core.sql` is the core.
- `docs/` — Phase-1 documents (charter, PRD, RFC, IA, competitive audit, risk, segment
  matrix, onboarding playbook) + `profile_source.py`.
- `CLAUDE.md` — project contract Claude Code reads each session.

## Stack
Supabase (Postgres + RLS) · Vite + React + TS · n8n · Gemini API · Cloudflare Pages.

## Status
Phase 1 documented. Building the walking skeleton (cockpit shell → read `stock_items`
→ deploy). See `CLAUDE.md` → "Current goal".
