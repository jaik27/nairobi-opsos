# STATE OF THE VENTURE — Nairobi OpsOS

> **Purpose.** This is the honest, whole-picture read of where Nairobi OpsOS stands —
> the *venture*, not just the code. It merges three sources: the file-by-file
> `PROJECT_AUDIT.md` (code reality), the Master Context Pack v1 (the vision/source of
> truth), and the Command Centre Tracker v1 (real business metrics). It exists so any
> future session starts from truth, not a partial or repo-blind picture.
>
> **Date of read:** 2026-07-01. **Read by:** strategic synthesis pass over the committed
> audit + Drive strategy docs + this session's verified operational evidence.

---

## 0. The most important caveat: critical state lives OUTSIDE the repo

`PROJECT_AUDIT.md` is an accurate read of the *code*, but it asserts several things
that are **factually wrong**, and the reason matters more than the errors:

- The audit claims "nothing has been deployed… the site doesn't exist yet" and
  "any Cloudflare Pages deployment — never attempted." **This is false.** The app is
  deployed and live at `nairobi-opsos.pages.dev` (verified live this session: build
  succeeded, env vars set, demo data served).
- The audit claims no signed-in session was ever exercised and "every screenshot was
  signed-out." **This is false.** The magic-link round trip was completed (signed in
  as the founder), a real org was provisioned by SQL, a PR was created that landed
  under the real org id `ef868e0c-1909-4b6c-a3b3-614dbeee66ba`, and two-way isolation
  was confirmed (demo org `…0d0` untouched in incognito).
- The audit treats migration `005` as unverified. It was applied ("Success. No rows
  returned") and the role constraint now reads `owner/procurement/finance/viewer`.

**Why the audit got these wrong:** Claude Code can only see the repository and its own
tool calls. Deployment (Cloudflare↔GitHub), the browser sign-in, and SQL-editor
migrations leave **no artifact in the repo**, so a repo-based audit is structurally
blind to them. The lesson: **the repo is NOT a complete system of record.** A whole
layer of operational truth (deployed URL, auth-verified, migrations applied, dashboard
config) lives in Cloudflare, Supabase, and the browser. `CLAUDE.md` must record this
operational state explicitly, or every fresh session re-inherits the blind spot.

**Operational truth as of this writing:** deployed live at `nairobi-opsos.pages.dev`;
auth round-trip verified end-to-end; migrations 001–006 applied; Supabase redirect URL
configured for production; PR approval workflow verified (happy path + security path).
None of that is providable from the repo alone.

---

## 1. Where we are against the VISION (two tracks)

The Master Context Pack defines Nairobi OpsOS as a **consulting-led** venture: land
Digital Workflow Audits with Kenyan SMEs, prove value, climb the offer ladder
(Audit → Sprint → Retainer → Full OS Build). The product is explicitly "both the OS
for running this venture **and** the first proof-of-concept." So there are two tracks.

### Track A — the VENTURE (go-to-market). Status: ~launch state.
Per the Command Centre Tracker: Qualified Prospects **1** (a sample row), Outreach
Drafts Ready **0**, Active Opportunities **1**, Monthly Revenue Expected **0**, audits
delivered **0**. The Manufacturing Scout mission is "Active — first to prioritize" but
has never been run. The Digital Workflow Audit offer is defined and priced
(KES 25k–75k) but unsold. **No real SME has been contacted, audited, or invoiced.**

### Track B — the PRODUCT (proof-of-concept). Status: real foundation, ~20% of one module.
A genuinely real, deployed, multi-tenant, auth-isolated application exists. But measured
against the six planned modules it is early, and — per the founder's own assessment —
**it is foundational infrastructure, NOT yet a client-showable artifact.** Four demo
SKUs of plastics and timestamp-numbered test PRs demonstrate the *plumbing works*; they
do not demonstrate value to a real SME owner looking at their own operation. The
client-facing proof-of-value the Master Context Pack calls for is the **audit on a real
client's data**, not this demo.

**The core tension:** the Master Context Pack's plan was *prospecting-led, product-as-
proof*. Reality has run *product-led, venture-untouched*. The build has been
substituting for the business.

---

## 2. The six product modules — honest scorecard

| # | Module (from Master Context Pack) | Status | What exists in code |
|---|---|---|---|
| 1 | Procurement & Stores Control Tower | **~30% built** | Stores (read), Mission Control (read), Purchase Requests (create + list + submit/approve/reject workflow + append-only audit trail). Auth + multi-tenant isolation live. Role-gated actions enforced at the RLS layer. |
| 2 | Owner Daily Dashboard | **Not built** | Mission Control is a procurement overview, not the owner-daily-visibility module described in the vision. |
| 3 | WhatsApp CRM & Follow-Up Engine | **Not built** | Zero code. |
| 4 | Tender / Proposal / Compliance Assistant | **Not built** | Zero code. |
| 5 | NGO Impact Reporting System | **Not built** | Zero code. |
| 6 | Autonomous Prospect Scout | **Not built** | Zero code. The Apps Script v0.5.1 shell (in Drive) is unported and has no real scout engine even there. |

**One of six modules is partially built; five are at zero.**

Within module 1, the schema is far ahead of the UI: migration `001` created a near-
complete procure-to-pay chain (suppliers, quotations, quotation_lines, purchase_orders,
purchase_order_lines, grns, grn_lines, invoices, payments, stock_movements). The app
surfaces roughly a fifth of it. The database models the whole flow; the screens expose
three slices of it.

---

## 3. What's real, what's verified, what's assumed (from the audit, corrected)

**Real and verified (outside-the-repo evidence):** deployment; authenticated lane
end-to-end; org isolation in both directions; migrations 001–006 applied.

**Real and verified by tooling (in-session):** Mission Control / Stores / Procurement
demo reads; the anon PR-create write path with org_id cross-checked; form validation
blocking bad submits; post-auth regression of the demo lane.

**Real and verified — approval workflow (strongest end-to-end test to date):**
- Happy path: submit → approve and submit → reject-with-comment both committed rows
  to `purchase_request_status_history` and the detail view reflected them immediately.
- Security path: with `profiles.role = 'viewer'`, a direct REST API `PATCH` against
  `purchase_requests` using the viewer's own JWT returned `[]` — 0 rows affected,
  database status unchanged. The RLS policy (`pr_approve_reject`) blocked the write
  server-side, not the hidden button.

**Genuinely absent (the audit is right):** no tests anywhere (no runner installed);
no CI (no `.github`, contradicts the Charter); `tsconfig` never sets `"strict": true`
(contradicts CLAUDE.md's own rule); no transaction across the two-insert PR path
(orphan risk); the anon demo-write surface has no rate limit or cap; every Supabase
response is an unchecked `as` cast with no `gen types` and no runtime validation;
the low-stock predicate is duplicated in four files while `v_reorder_alerts` encodes
it server-side and is never queried; two `onAuthStateChange` subscriptions; stale
root README; `pr_number` is a `PR-${Date.now()}` shortcut.

None of this is alarming for the stage — it is the honest map of *real* vs
*looks-finished*.

---

## 4. The strategic question this raises

The engineering is legitimate: a solo founder, on a 2016 MacBook, near-zero budget,
stood up a deployed multi-tenant SaaS foundation with real auth and row-level isolation.
That is real skill and real work.

But against the **actual goal** — a consulting venture earning revenue from Kenyan SMEs
— the position is approximately the starting line: 0 clients, 0 audits, 0 revenue, ~20%
of one of six modules, and a product not yet client-ready.

The open question for the next phase is **not** "is the code good" (it is fine). It is:
**what is the smallest real thing that moves Track A off zero** — one real SME
conversation, one audit, even unpaid — and does the next build serve *that*, or does it
just extend a foundation that already outpaces the business it exists to support?

---

## 5. Immediate record-keeping fixes (so the repo stops lying about itself)

1. Update `CLAUDE.md` "Current state" to record operational truth: **deployed live at
   `nairobi-opsos.pages.dev`; auth round-trip verified; migrations 001–005 applied;
   production redirect URL configured.**
2. Refresh the stale root `README.md` (still describes the "walking skeleton" stage).
3. Keep this file (`STATE_OF_THE_VENTURE.md`) as the venture-level companion to the
   code-level `PROJECT_AUDIT.md` and the strategy-level Master Context Pack.
