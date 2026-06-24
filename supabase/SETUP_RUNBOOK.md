# Nairobi OpsOS — Procurement & Stores Control Tower
## Setup Runbook (Supabase + PWA + n8n)

This stands up the first real, client-demoable module on the credible stack.
Everything heavy runs in the cloud; your 2016 MacBook only runs VS Code + Node +
a coding agent. Net new cost: **0** (Supabase free, Cloudflare Pages free,
n8n self-host free, models on your existing Gemini/Claude plans).

---

### The architecture (three layers)

```
 DATA            Supabase (Postgres + RLS)      <- the source of truth
                   |  auto REST + GraphQL API
 APP             PWA (Vite + React) on           <- installable on iPhone,
                 Cloudflare Pages                    your own domain, offline
                   |  reads/writes via supabase-js
 AUTOMATION      n8n (self-hosted)               <- nightly reorder alerts,
                   |  Postgres + WhatsApp/email       daily intelligence,
                                                       later: eTIMS + M-Pesa
```

The data layer (the two SQL files) is the foundation and is already built and
validated. Stand it up first — the moment you run it, Supabase gives you a
working API and an admin data view, so you have a live backend in ~5 minutes.

---

### Step 1 — Supabase project + schema  (~5 min, browser only)

1. Create a free project at supabase.com (pick the **Nairobi-closest** region:
   currently `eu-central` / Frankfurt or `ap-south` / Mumbai — Mumbai usually
   has lower latency to Kenya; test both).
2. Open **SQL Editor** → paste and run `001_procurement_core.sql`.
3. New query → paste and run `002_demo_seed.sql`.
4. Open **Table Editor**: you now have the full procurement chain populated with
   the demo tenant. Open **Database → Views** and query `v_reorder_alerts` and
   `v_quote_comparison` — these are your "control tower" intelligence.

You now have a live, auto-generated REST + GraphQL API over this schema.

### Step 2 — Keys & the security model (read this carefully)

In **Project Settings → API** you get two keys. Understand the difference — it
is the whole security model:

- **anon key** — *public and safe to ship in the PWA.* RLS guarantees an
  anon visitor can only ever read the demo tenant. This is by design.
- **service_role key** — *secret. Server-side only.* It bypasses RLS. It goes
  **only** into n8n's encrypted credential store. Never in the PWA, never in
  git, never in a chat.

### Step 3 — Scaffold the PWA  (on your Mac, in VS Code)

Prereqs: install Node LTS (via `nvm`), `git`, and a coding agent — either
**Claude Code** (`npm i -g @anthropic-ai/claude-code`, included in your Pro
plan) or **Cline** (VS Code extension, bring-your-own-key; point it at the
Gemini free tier for $0).

```bash
npm create vite@latest nairobi-opsos -- --template react
cd nairobi-opsos
npm install @supabase/supabase-js
npm install -D vite-plugin-pwa
git init && printf "node_modules\ndist\n.env\n" > .gitignore
```

Create `.env` (never committed):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Create `src/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Then let the coding agent build the UI **against the schema and your existing
cockpit design**. A good first prompt:

> "Build a mobile-first PWA dashboard for the Procurement & Stores Control
> Tower. Reuse the dark design tokens from my old Stylesheet.html (lime/cyan
> on near-black). Read from Supabase views `v_reorder_alerts`,
> `v_quote_comparison`, and tables `purchase_orders`, `invoices`. Screens:
> Mission Control (reorder alerts + open LPOs + unpaid invoices), Quote
> Comparison (rank suppliers per PR), Stock. Use supabaseClient.js. No secrets
> in code."

This is the point of the agentic loop: you describe the screen, it writes the
React against the real API, you review the diff.

### Step 4 — Deploy the PWA (free, installable)

1. Push the repo to GitHub.
2. Cloudflare Pages → connect the repo → build command `npm run build`,
   output dir `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build env vars.
4. On iPhone: open the Pages URL in Safari → Share → **Add to Home Screen**.
   It now behaves like a native app — this is your client demo.

### Step 5 — n8n (the self-evolving automation layer)

Host n8n free on an **Oracle Cloud Always Free** ARM VM (genuinely free, not a
trial), or Railway/Render. Its job is the scheduled intelligence your old spec
described, now with a real engine:

- **Nightly**: query `v_reorder_alerts` → if anything is below reorder level,
  send the owner a WhatsApp/email digest ("4 SKUs below reorder, draft LPOs?").
- **Daily Intelligence**: Gemini (grounded search) over your sector signals →
  write rows into a recommendations table.
- **Later**: submit invoices to the KRA eTIMS API; poll M-Pesa Daraja and mark
  `payments.reconciled`.

n8n connects to Supabase with the Postgres connection string + **service_role**,
stored in n8n's encrypted credentials — never in the repo.

---

### Save this at the repo root as `CLAUDE.md` (the agent's standing contract)

```markdown
# Nairobi OpsOS — Procurement & Stores Control Tower

## What this is
A multi-tenant ops system for Kenyan manufacturers/distributors. First module:
procurement chain (PR -> Quotation -> LPO -> GRN -> Invoice -> Payment) plus a
stock ledger. Also a portfolio piece, so code quality is the product.

## Stack
- Data: Supabase (Postgres + RLS). Source of truth.
- App: Vite + React PWA, supabase-js, deployed on Cloudflare Pages.
- Automation: n8n (self-hosted).
- Models: Gemini API free tier (runtime), Claude/Cline (build loop).

## Non-negotiable rules
1. SECRETS: never put any key in code or git. anon key only in PWA env;
   service_role only in n8n credentials.
2. RLS IS SACRED: every new table gets org_id, RLS enabled, and an
   org_isolation policy. No table ships without it.
3. MIGRATIONS: numbered SQL files only. NEVER edit a shipped migration —
   add the next-numbered file. The DB is the source of truth, not memory.
4. DEMO TENANT: the only anon-readable data. Never expose real orgs to anon.
5. eTIMS-READY: stock changes go through stock_movements (the ledger), never
   by mutating a quantity column. Invoices keep KRA fields populated.
6. DESIGN: reuse the dark cockpit tokens (lime/cyan on near-black).
7. FOCUS: ship one working screen end-to-end before starting the next.

## Before any change
Read this file and the latest migration. Propose the change, show the diff,
wait for approval on anything that writes data or touches policies.
```

---

### Security checklist (enterprise-grade hygiene)

- [ ] `.env` is in `.gitignore`; no key ever committed.
- [ ] anon key only in the PWA; service_role only in n8n.
- [ ] RLS enabled on **every** table (the migration does this — keep it true
      for new tables).
- [ ] Demo tenant is the only anon-readable data.
- [ ] If a key leaks, rotate it in the Supabase dashboard immediately.

### Ship-this-week sequence
1. Run the two SQL files (Step 1). **You have a live backend today.**
2. Scaffold + agent-build the three demo screens (Step 3).
3. Deploy to Cloudflare Pages, add to iPhone home screen (Step 4).
4. One n8n nightly reorder-alert flow (Step 5).

That is a genuinely demoable, multi-tenant, eTIMS-aware control tower — built on
a credible stack, on the hardware you have, for nothing.
