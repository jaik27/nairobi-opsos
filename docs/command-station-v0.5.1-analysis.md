# Command Station v0.5.1 — Analysis & Porting Spec

> **STATUS: REFERENCE ONLY — DO NOT BUILD FROM THIS YET.**
> This is the porting spec for the COMMAND domain of the unified OpsOS. It is read
> when (and only when) the Control Tower vertical (Stores → Procurement) is finished
> and we begin the Command layer. Until then it is a record, not a build instruction.
> Sequence lives in CLAUDE.md / docs/CONTEXT_PACK.md.

## 1. What v0.5.1 is (read from source, 2026-06)
A polished phone-first cockpit SHELL on a Google Sheets backend. It reads rows from a
6-tab sheet and renders them well. That is the whole working surface.

- **Backend:** one Google Sheet (`Config.gs` → 6 tabs: Prospects, Tasks, Build Log,
  Revenue, Search History, Daily Intelligence).
- **Read path (works):** `DataService.gs` `getAppState()` loads counts + recent rows;
  client renders tiles, daily-intel cards, prospect cards, activity feed, section lists.
- **Demo Mode (works):** `DemoData.html` sampleDemo; client-safe toggle.
- **Design system (keep):** `Stylesheet.html` — the cockpit tokens/visual language.
  This is the asset worth porting verbatim into React.

## 2. The gaps (priority order) — what it does NOT do
1. **The "AI Command Bar" has no AI and no actions.** `runCommand()` is a keyword
   `includes()` matcher: classifies text into 5 intents, writes a Search History row,
   returns canned stage labels. No Gemini, no execution. Flagship feature is a logger.
2. **Action buttons are decorative.** "Find Prospects", "Draft Outreach", "Generate
   Today's Intel", "Create Task", "Add Opportunity" — rendered as ghost buttons, no
   handlers wired (`Sections.html`).
3. **No engine generates prospects or intel.** Scout shows hand-entered sheet rows.
   Daily Intelligence is hand-authored. No search, no data source, no generation.
4. **Writes are append-only.** Only `appendRowByHeaders_` exists. No update/edit/status
   transitions — tasks & pipeline are read-only lists.
5. **"Search Memory" dedupe is copy, not code.** UI claims history-checking; no dedupe
   logic exists. (Note: the Command Bar Spec v1 defines full dedupe — it was specced,
   never implemented.)
6. **Sheets backend; no auth/multi-user/integrity.** Exactly what we migrate to Supabase.
7. **Settings & Notifications are empty scaffolds; keyword router is brittle** (no params
   like "in Ruiru" extracted; "manufacturer" anywhere trips prospect-search).

## 3. The spec→reality gap (the real roadmap)
Jay's own Drive specs already describe the finished vision. v0.5.1 is a thin first cut.
The porting work is closing the distance between them:
- **Master Context Pack v1** lists **Autonomous Prospect Scout** as a first-class module:
  standing missions (Manufacturing Scout, Distribution Scout, NGO Impact Scout, Clinic
  Admin Scout, Hospitality Scout) that periodically find → research → score → dedupe →
  create records → draft outreach → send Jay a lead briefing for approval.
- **AI Command Bar & Daily Intelligence Spec v1** defines two modes: reactive (route a
  typed command) and **proactive** (recommend the day's highest-value searches/actions,
  grouped by segment, each with why-today / novelty / priority / suggested command /
  approval flag), plus full dedupe logic and statuses (new/duplicate/stale/refinement/
  follow-up/skip).
- **Responsive Dynamic UI Spec v1** is the visual + interaction standard (phone-first,
  no spillover, command-bar staged progress, Daily Intelligence card anatomy).
- **Automation boundary (hard rule):** AI may research, summarize, score, recommend,
  draft. It may NOT auto-send outreach, quote prices, commit, or contact prospects
  without Jay's approval. → every consequential action is human-confirmed.

## 4. What 2026 changes (the engine is now cheap)
- **Command bar → real agent in ~one call.** Gemini (`gemini-3-flash` /
  `gemini-3.1-flash-lite` — drop any 2.0 Flash ref, shut down 2026-06-01) supports
  **function calling + structured output together**: declare app actions as function
  schemas; Gemini returns a structured `functionCall` (e.g.
  `find_prospects(segment, area)`); the app executes it. Google's docs explicitly say to
  **confirm consequential calls with the user before executing** → matches the automation
  boundary above.
- **Scout finds real businesses with no new infra.** Gemini 3 has **built-in Google
  Search + Google Maps grounding** in a single call, returning structured JSON. So
  "find distributors in Ruiru" → grounded candidates → human review → save as prospects.
  Free-tier to start.
- **Avoid the Places API trap.** Google killed the old $200 credit (ended Feb 2025);
  Places now bills per-SKU — Essentials ~$275/mo, Place Details Pro $17/1k, contact
  details $400+. Non-starter for near-zero budget as the primary source. **Use Gemini
  grounding for MVP**; for bulk structured business data the free path is **OpenStreetMap
  Overpass** (wrappers like BizData expose it as clean REST, no key). Reserve Places API
  for paying-client precision work, with strict field masks.
- **Real dedupe becomes possible.** Postgres can actually query prior `search_history`
  before recommending — so the Command Bar Spec's dedupe logic stops being aspirational.

## 5. Inferred data model → COMMAND domain tables
Columns inferred from how the Apps Script reads the sheets. **VERIFY against real sheet
headers before finalizing `003_command_core.sql`** — marked ⚠ where inferred.

- **prospects:** company_name, sector, location, fit_score, likely_pain_point ⚠
  (+ status, notes, source, created_at)
- **daily_intelligence:** segment, recommendation, why_today, novelty_status, priority,
  suggested_command ⚠ (+ approval_required, expected_output, created_at)
- **tasks:** task, priority, status, notes ⚠ (+ due_date, completed_at)
- **build_log:** build_item, status, notes ⚠ (+ created_at)
- **revenue (pipeline):** opportunity, status, notes ⚠ (+ stage, value_estimate, next_action)
- **search_history:** date, search_id, segment, search_theme, query_command, source_type,
  reason, result_summary, novelty_status, status ⚠

These map almost 1:1 from the 6 sheets. All COMMAND tables are **founder-scoped** (see §6).

## 6. Security model (the non-negotiable)
Unified app, two domains, one Supabase, two scopes that never cross:
- **COMMAND tables (this spec):** founder-only. Either a separate schema not exposed to
  client roles, or RLS policies restricted to Jay's founder role. Client tenants must
  never read a single BD row.
- **CONTROL TOWER tables (already built):** multi-tenant, per-tenant RLS (001).
- A client in their Control Tower tenant cannot see Command data; the founder layer does
  not pollute any client tenant.

## 7. Build order (when the time comes — after Control Tower vertical)
1. `003_command_core.sql` — translate the 6 tables above, founder-scoped RLS. Verify
   real sheet headers first.
2. Port screens onto live data, read-path first (same pattern as Stores), reusing the
   Stylesheet design language. Wire the *real* buttons (create task inserts; mark-complete
   updates) — close the append-only gap.
3. **Scout engine first** (highest value, most demoable): Gemini + Maps/Search grounding
   → structured candidates → human-confirm → save as prospects. Then standing "missions".
4. **Daily Intelligence generation:** Gemini proposes the day's recommendations, checked
   against `search_history` (real dedupe now). Implements the Command Bar Spec's proactive
   mode.
5. **Command bar as agent LAST:** function-calling router over the actions that now exist.
   No point wiring the router before the functions are built.

## 8. Source artifacts (Drive, reference)
- Modular source: Code.gs, Config.gs, DataService.gs, CommandService.gs, Page.html,
  Stylesheet.html, DemoData.html, Components.html, Sections.html, JavaScript.html, README.
- Specs: Master Context Pack v1, AI Command Bar & Daily Intelligence Spec v1, Responsive
  Dynamic UI Spec v1. Read the UI Spec + Command Bar Spec before porting screens.
- When porting begins, stage the modular source into `reference/command-station-v0.5.1/`
  (read-only — port FROM, don't paste IN).
