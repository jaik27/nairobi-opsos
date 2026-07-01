# Control Tower — Gap Analysis & Build Checklist

> **STATUS: REFERENCE / CHECKLIST — read before starting the next operational vertical.**
> This is not a "build all of this now" instruction. It is a scoped map of what the
> Control Tower is missing to be a real procure-to-pay + inventory tool for a Kenyan
> SME, split into **table stakes** (build, in roughly this order) and **out of scope**
> (real features that would be gold-plating right now — see Risk Register R-12).
> Grounded in 2026 procurement-software research (Procurify, Precoro, Tradogram,
> Order.co, Kissflow, Fraxion) cross-checked against docs/04_Information_Architecture.md.

## 0. The one-line thesis
We have built the **nouns** (requests, stock, items). The entire procurement category is
really about the **verbs** — submit, approve, reject, order, receive, match, pay — and
the **audit trail** of who-did-what-when. Real procurement software *is* a workflow/state
machine. The gateway to all of it is **auth/identity**: without "who is acting," there is
no approval, no audit, no per-user dashboard. So **real Supabase Auth is the keystone**,
not a side quest — it's the same blocker as migration 004's demo-write sandbox.

## 1. The canonical flow (what the category does)
Every credible 2026 tool models this chain; our IA (§6) matches it:
**Raise PR → Request quotes (RFQ) → Compare quotes → Issue PO → Goods receipt (GRN)
→ Capture invoice → 3-way match (PO vs receipt vs invoice) → Record payment.**
We have built link 1 (raise PR). Links 2–8 are the roadmap. The "3-way match" is named
by nearly every source as the core of where procurement automation pays for itself.

## 2. Per-screen gaps

### Procurement → Purchase Requests (newest screen)
**Table stakes missing (build, in order):**
1. ✅ **Approval workflow** — submit → approve/reject-with-comment, role-gated at the
   RLS layer (`pr_approve_reject` policy), append-only `purchase_request_status_history`
   audit trail. Verified: happy path end-to-end + viewer blocked at REST API.
2. ✅ **PR detail view** — lines, metadata, action buttons, status history timeline.
   Row-click from the list opens `PurchaseRequestDetail`.
3. ✅ **Status filter / tabs** — All / Draft / Submitted / Approved / Rejected tabs with
   live counts, client-side filter via useMemo.
4. **Edit / cancel a draft** before submission.
5. **Document attachment** — a quote PDF, a photo of the broken part. Universal; genuinely
   useful for SMEs.

**Out of scope now:** budget checking at requisition, GL coding, multi-tier dollar-
threshold routing, spend analytics, anomaly detection. (Coupa/Ariba territory.)

### Stores → Stock on Hand
**Table stakes missing:**
1. **Stock movement entry** — receive / issue / adjust-count. For an inventory tool this
   is the core verb and it's absent (screen is read-only). The data model already supports
   it: `on_hand` is ledger-derived, so movements are the intended write.
2. **Per-item movement history** — click an item → its ledger. The schema is *built* for
   this (append-only movements); no screen exposes it yet.
3. **"Reorder now" action** from a below-reorder row → pre-fills a Purchase Request. The
   obvious one-click bridge Stores → Procurement that real tools make seamless.
4. Location filter; stock valuation breakdown by location/category.

**Out of scope now:** barcode scanning, multi-warehouse transfers, batch/expiry tracking,
demand forecasting. (Segment-dependent; not the manufacturing/distribution MVP.)

### Mission Control
**Table stakes missing:**
1. **Click-through tiles** — "3 reorder alerts" should open the filtered list. Tiles are
   currently dead ends; every dashboard in the research drills down.
2. **Pending-approvals surface** — once approvals exist, "what needs *me*" is the highest-
   value thing a dashboard shows. (Depends on auth + approval workflow.)
3. **Real recent-activity feed** of actual events (not sample data).

**Out of scope now:** configurable widgets, spend-trend charts, AI insights.

### Invoices (still a ComingSoon placeholder)
The whole screen, plus the middle of the chain, is unbuilt — and that's correct
sequencing, not a flaw. Downstream of PR: **Quotations/RFQ, Purchase Orders, Goods
Receipt, Invoices, Payments, and the 3-way match.** Some tables may already exist in
001 (quotations/quotation_lines were referenced during recon); verify before assuming.
The gap here is overwhelmingly **screens + workflow**, sequenced after auth + approvals.

## 3. Cross-cutting (the real theme)
- **No state transitions anywhere.** The app can read and create; it can't move a record
  through a workflow. Real procurement value lives in the state machine + audit trail.
- **No auth/identity** → no approver, no "my items vs all," no audit of who did what.
  This is the keystone. It also unblocks replacing migration 004's demo-write sandbox.
- **No detail views** — list-only on every entity; you can't open a record.
- **No attachments** anywhere.
- **Empty states** exist as text but don't guide the next action.

## 4. Recommended next-vertical order (highest leverage first)
1. ✅ **Real Supabase Auth** (login, session, profiles→org, role: owner/procurement/finance/
   viewer per IA §9). Keystone — replaces 004's anon-write fence, unlocks everything below.
2. ✅ **PR approval workflow** (submit/approve/reject-with-comment + PR detail view + status
   tabs + RLS role gate + append-only audit trail). Verified end-to-end.
3. **Stock movements** (receive/issue/adjust + item history). Makes Stores a real inventory
   tool and feeds Mission Control's numbers from real events.
4. **Stores→PR "reorder now" bridge** + Mission Control click-through + pending-approvals
   tile. Cheap, high-perceived-value connective tissue.
5. **Then** continue the chain: Quotations → PO → GRN → Invoice → payment/3-way match.

## 5. Discipline notes
- Resist building the chain (POs, invoices, matching) before auth + approvals exist — it's
  the gold-plating R-12 warns against, and every link needs identity to be meaningful.
- Each item above is its own vertical slice (one migration if needed + one screen),
  same pattern as Stores and Purchase Requests. Build one, verify live, commit, repeat.
- The pr_number client-side timestamp shortcut (flagged in CONTEXT_PACK) should be
  revisited when auth lands and real numbering matters.
