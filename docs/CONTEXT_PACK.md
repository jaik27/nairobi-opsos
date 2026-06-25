# CONTEXT_PACK.md — Nairobi OpsOS

The durable "how and why" of this project. `CLAUDE.md` says what the stack is and
where the build stands; **this** file carries the lived history — the decisions,
the texture, the artifacts, and the way Jay works — so any fresh session (a new
claude.ai chat or Claude Code) picks up the thread without re-deriving it.

Read this after `CLAUDE.md`, before giving advice or building.

---

## 1. Who and what
Jay Shah, Nairobi. Solo founder, near-zero cash budget, 2016 MacBook, GitHub `jaik27`.
Nairobi OpsOS is a **consulting-led** digital operations + AI automation venture for
Kenyan SMEs — replacing scattered Excel/WhatsApp/paper/email with practical systems
for procurement, inventory, sales/CRM, payments, compliance, and reporting. The
positioning is **operational clarity**, not "software development" or "AI hype."

Offer ladder: Workflow Audit (paid diagnostic) → 14-Day Automation Sprint → Monthly
Retainer → Full OS Build.

Target segments, in priority order: manufacturing/industrial, FMCG/distribution, NGOs
(Tier 1 — OpsOS is the spine); clinics, hospitality, schools (Tier 2 — integrate
beside incumbents). See `docs/05` and `docs/07`.

## 2. The two-product distinction (do not merge these)
This is the most important architectural fact, and it's easy to get wrong because both
share a name and a dark "cockpit" look:

- **Control Tower** = the *client-facing product*. Operational, transactional, one
  tenant's real data (procurement, stores, stock_items). This is what we are building
  in `apps/web` now (Mission Control, Stores, Procurement, Invoices).
- **Command Station** = Jay's *own* founder/BD cockpit (the v0.5.1 Apps Script app).
  Prospects, Scout, Daily Intel, Search Memory, Build Lab, Pipeline/Revenue. It runs
  *Jay's* business of finding and winning clients. It is NOT a client's operational data.

They share a **design language**, not a data model. When we "integrate the Command
Station," we port its **UX** (header treatment, tiles with orbs/progress, the "Ask…"
command bar, Next Best Action, tab bar) into the Control Tower's design system. Its
**modules** (Prospects/Scout/Intel) are a separate concern — decide deliberately
whether they become a second OpsOS module or stay Jay's private ops layer. Never fuse
them just because they look alike.

## 3. The Apps Script artifact (reference only — port FROM, don't paste IN)
The v0.5.1 Command Station is real and lives in Jay's Drive, not the repo:
- Deployable archive: `Jay_Command_Station_v0_5_1_Modular_AppsScript.zip` (Drive).
- Modular source: server `Code.gs`, `Config.gs`, `DataService.gs`, `CommandService.gs`;
  client includes `Page.html`, `Stylesheet.html`, `DemoData.html`, `Components.html`,
  `Sections.html`, `JavaScript.html`; plus `README.md`.
- Design authority docs in Drive: **Responsive Dynamic UI Spec v1** (the cockpit visual
  + interaction standard — phone-first, no spillover, lime/cyan/amber accents, command
  bar staged-progress, Daily Intelligence card anatomy), **AI Command Bar & Daily
  Intelligence Spec v1**, **Master Context Pack v1**, **Command Centre Tracker v1**.
- Live screens already designed there: Home/Mission Control, Intel, Scout, Tasks,
  Memory/Search, Build Lab, Pipeline/Revenue, Demo Mode.

Rule: these are the **source of the design language and the founder-side logic**. We
translate them into React on the working foundation; we do not paste Apps Script in,
and we do not build *in* the old folders.

## 4. Stack and the decisions behind it (don't re-litigate)
Supabase (Postgres + RLS) source of truth · Vite + React + TS PWA in `apps/web` ·
n8n automation (later) · Gemini API runtime AI (later) · **Cloudflare Pages** deploy
(NOT Netlify/Vercel) · Claude Code build loop.

Decisions worth remembering *why*:
- **Cloudflare Pages, not Netlify/Vercel** — the CI and preview setup are written around
  it; all three work, we picked one, move on.
- **on_hand is ledger-derived**, not a column — reads merge `stock_items` +
  `v_stock_on_hand` per the RFC's append-only movements design. (Claude Code already
  honored this; keep it.)
- **HAL is a reference specimen, not the customer** — its real item master (5,793 rows)
  was profiled only to calibrate the structured-ledger ingestion adapter. Never build
  "for HAL."
- **Integration-first / adapter-library** — build around existing tools (Excel,
  WhatsApp, QuickBooks, vertical systems) via ~5 source-shape adapters over one shared
  staging/validate/dedup/confirm core. Never rip-and-replace; never auto-merge imports.
- **AI drafts, Jay approves** — any external action or data commit is human-confirmed.
- **Near-zero budget** — free tiers only until revenue; don't assume paid SaaS.

## 5. How Jay works (the texture a fresh chat won't have)
- **Honest pushback over agreement.** Don't just agree; name trade-offs, flag when
  something falls short instead of presenting it as done. Jay said this explicitly.
- **Exact, executable guidance.** Click-by-click and line-by-line, not concepts.
  Downloadable seed/zip files plus the exact terminal commands — not "go set up X."
- **Research/plan first, then build.** Present the game plan before output.
- **First-person founder voice in docs** — these read as Jay's, not an assistant's.
- **Anti-perfectionism is a stated risk (R-12).** Ship the walking thing, then enrich.
  "Make it real before you make it rich." Resist polishing before plumbing works.
- **The repo is the system of record**, not any chat. Update `CLAUDE.md` (state) and
  this file (lived history) so continuity survives session boundaries.

## 6. Build history (what actually happened)
- Phase 1: nine planning docs (`docs/00`–`08`) + validated SQL schema
  (`supabase/migrations/001`, `002`) + DevOps playbook + a clickable HAL demo.
- Profiled a real HAL item master → calibrated the structured-ledger adapter; added
  R-13 (onboarding/data-quality as the real cost driver).
- Built the repo seed, stood up the monorepo, scaffolded `apps/web` (Vite+React+TS+
  Tailwind, cockpit tokens), shipped the **walking skeleton** (Mission Control on mock
  data), pushed to `main`.
- Stood up Supabase, ran both migrations (demo org = 4 SKUs), wired Mission Control to
  **live** data (stock_items + v_stock_on_hand). Live, committed, pushed.

## 7. Next steps (the through-line)
1. Build one more screen end-to-end with live data: **Stores → Stock on Hand** (reads
   tables already proven; isolates the screen-building pattern from write-paths).
2. Deploy `apps/web` to **Cloudflare Pages** (root dir `apps/web`, build `npm run build`,
   output `dist`, env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
3. Then **Procurement → Purchase Requests** (first write-path).
4. Then **port Command Station UX** screen-by-screen (reference only) — decide the
   Command Station's place (second module vs private layer) before merging anything.
5. Later: n8n nightly reorder-alert digest; Gemini command bar; the ingestion adapters.

## 8. Drive artifact map (source-of-truth docs outside the repo)
- Project HQ folder; **Master Context Pack v1**; **Responsive Dynamic UI Spec v1**;
  **AI Command Bar & Daily Intelligence Spec v1**; **Command Centre Tracker v1**;
  **Live Code** folder + **Build v0.5.1 Files** (the modular source + zip).
- These predate the repo and hold the founder-side vision. When porting Command Station
  UX, read the UI Spec and Command Bar Spec first.
