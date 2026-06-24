# Segment Onboarding Playbook — Nairobi OpsOS

| Field | Value |
|-------|-------|
| **Document** | Segment Onboarding Playbook (operational method) |
| **Version** | 0.1 |
| **Date** | 24 June 2026 |
| **Owner** | Jay Shah |
| **Related** | `07_Segment_Tooling_Integration_Matrix.md` (shapes & adapters), `03_Technical_Design_RFC.md` §7 (ingestion core), `profile_source.py` (the profiler) |
| **Tool** | `profile_source.py` — run on any client export/sheet |

---

## 1. Purpose
A repeatable, teachable method for taking on **any** new segment or client without
engineering a bespoke system each time. We don't pre-build "the NGO system" or "the
clinic system." We meet a real one, profile its real data the way we profiled HAL,
identify which **source shape** it is, and configure a thin segment module on top of
the shared platform. This document is written so that **I — or eventually someone I
hire — can run it without specialist help.**

Every stage maps to the offer ladder, so the method is also how you *sell*:
discovery and profiling **are** the paid Workflow Audit.

## 2. The core idea (why this scales)
There are not six segment problems. There are ~5 recurring **source shapes**, and
segments share them. So "how do we handle the others?" mostly collapses to "which
shape is this, and what's the thin segment-specific layer?"

What is *actually* segment-specific is small and bounded — only three things:
- **Vocabulary** — an NGO says *grant/fund*; a manufacturer says *cost centre*; a
  clinic says *consumable* differently than a foundry.
- **Spine shape** — procure-to-pay (manufacturing), route-to-market (distribution),
  grant-to-report (NGO), etc.
- **Compliance edge** — eTIMS everywhere, plus SHIF (clinics), NEMIS (schools),
  donor rules (NGOs).

Everything else — ingestion, de-dup, validation, the source of truth — is shared.

## 3. The onboarding loop (six stages)
Run these in order for every new client. Owner = who does it; AI = where Claude/
Gemini assist (always human-approved).

```mermaid
flowchart LR
    S0[0 Qualify & tier] --> S1[1 Discovery interview]
    S1 --> S2[2 Get ONE real file]
    S2 --> S3[3 Profile it]
    S3 --> S4[4 Map + configure]
    S4 --> S5[5 Flag compliance edge]
    S5 --> S6[6 Decision gate → scope]
```

| Stage | What happens | Owner / AI | Output | Offer-ladder tie |
|-------|--------------|-----------|--------|------------------|
| 0 Qualify & tier | Decide Tier 1 (spine) vs Tier 2 (complement); is there a real pain + budget? | Jay | Tier call, go/no-go | Pre-sales |
| 1 Discovery interview | Structured questions (§4) to map current workflow & tools | Jay (AI drafts notes) | Workflow map, pain list | **Workflow Audit** |
| 2 Get ONE real file | Ask for a real export/sheet (§5) — not a description | Jay | The artifact | **Workflow Audit** |
| 3 Profile it | Run `profile_source.py`; identify shape (§6) | Jay + AI | Profile report, shape | **Workflow Audit** |
| 4 Map + configure | Map columns→canonical; set vocabulary & spine (§7–8) | Jay + AI | Field mapping, config | Audit → **Sprint** |
| 5 Flag compliance edge | Identify eTIMS + segment edge (§8) | Jay | Compliance checklist | Sprint scoping |
| 6 Decision gate → scope | Spine / complement / decline; scope the build (§9) | Jay | Proposal & scope | **Sprint / Retainer** |

## 4. Discovery question bank
**General (every segment):**
1. Walk me through one full cycle from "we need something" to "it's paid for." Who
   touches it, in what tool, at each step?
2. Where does information live today — WhatsApp, email, Excel, an accounting package,
   a vertical system? Which is the *real* record vs. a copy?
3. What breaks most often — duplicates, wrong numbers, things lost, slow approvals,
   month-end reconciliation?
4. Who re-types data from one place into another? (That seam is the wedge.)
5. What must you report, to whom, and how painful is it? (Compliance/edge.)
6. How do you get paid / pay out — M-Pesa, bank, both?
7. If one thing were fixed first, what would save the most time or money?

**Segment-tailored openers (ask in addition):**

| Segment | Ask specifically about |
|---------|------------------------|
| Manufacturing | item master & duplicates; stores in/out; reorder levels; supplier quotes; any ERP it shadows |
| Distribution/FMCG | route/beat plans; rep order capture (paper?); M-Pesa wallet→transaction reconciliation; stock per route |
| NGO | restricted vs unrestricted funds; grant/programme tagging; procurement rules (ToRs, bids); donor report formats |
| Clinic/lab | which HMIS (if any); pharmacy/stores stock; SHIF claims; what the HMIS *doesn't* do well |
| Hospitality | which POS; recipe→ingredient stock; supplier ordering behind the POS; multi-outlet |
| School | which school-ERP; NEMIS submissions; kitchen/boarding/lab stores; fee vs procurement split |

## 5. The artifact request (Stage 2)
Always get **one real file**, never a description — theory misses what real data shows
(HAL's "clean" master still had ~10% duplicates). Script:

> "To make the audit concrete, send me one real export — your current stock sheet,
> item list, or last month's tracker, exactly as it is. Messy is fine; messy is the
> point."

What to ask for, by shape/segment:
- Manufacturing/distribution/larger NGO-school: the **stock/item tracker** (Excel).
- NGO/SME finance: a **QuickBooks export** (item/GL/fund list, or invoices).
- Clinic/hospitality/school (Tier 2): an **export from the HMIS/POS/school-ERP**.
- Micro/long-tail: whatever single **sheet** they actually use.

## 6. Profile it (Stage 3) — the same script every time
Run the profiler on the file they send:

```bash
python profile_source.py CLIENT_FILE.xlsx
# focus a sheet / pick the human key column:
python profile_source.py CLIENT_FILE.xlsx --sheet "ITEM DB" --key "SHORT ITEM DESCRIPTION"
```

It reports sheets, the detected header, per-column completeness, controlled
vocabularies, whitespace/`#REF!` anomalies, duplicate clusters, and a **shape guess**.
Read it to answer: *what shape is this, how dirty is it, and what's missing?*

**Shape identification:**

| If the profile shows… | Shape | Adapter |
|-----------------------|-------|---------|
| Item master + IN/OUT/STOCK tabs, code tables, generated codes | Structured ledger | structured-ledger (Excel) |
| GL / classes / funds / invoices | Accounting | QuickBooks/accounting-export |
| Patient/claim/POS-sales/enrolment/fees columns | Vertical export | vertical-system-export (Tier 2) |
| One ad-hoc sheet, merged cells, no IDs | Formless | formless-sheet |
| Free-text messages | Messaging | messaging-intake |

## 7. Map + configure (Stage 4)
1. **Map detected columns → OpsOS canonical fields** (item, UOM, supplier, category,
   reorder point, price…). Save the mapping *per client* (one-time cost).
2. **Import the source's controlled vocabularies as reference data** — its UOM list,
   category/group tables, supplier/manufacturer list. Don't re-type what's already
   controlled (on HAL these came through clean).
3. **Set the spine** for the segment (procure-to-pay / route-to-market / grant-to-
   report). Same engine, different default flow + screens.
4. **Run the shared core**: staging → validate → de-dup → human confirm → commit.

## 8. Segment module configuration (vocabulary, spine, compliance edge)

| Segment | Spine | Vocabulary notes | Compliance edge (beyond eTIMS + M-Pesa) |
|---------|-------|------------------|------------------------------------------|
| Manufacturing | Procure-to-pay + stores | item/FA-RM-SC groups, UOM | — |
| Distribution/FMCG | Route-to-market | outlet, beat, route, rep | — |
| NGO | Grant-to-report | fund, grant, programme, donor | Donor reporting; restricted-fund rules |
| Clinic/lab | Procurement beside HMIS | consumable, pharmacy stock | SHIF; ODPC/health data |
| Hospitality | Procurement beside POS | recipe, ingredient, outlet | — |
| School | Procurement beside school-ERP | stores, kitchen, boarding | NEMIS as enrolment source of truth |

## 9. Decision gate (Stage 6)
Decide the engagement shape and scope it:
- **Tier-1 spine build** — generic-tool segment, real pain, OpsOS becomes the source
  of truth. → Audit converts to a 14-Day Sprint on the highest-ROI slice.
- **Tier-2 complement** — entrenched vertical system present; only enter the
  procurement/stores slice it under-serves, beside the incumbent. Verify the
  incumbent exposes an export/API first.
- **Decline / defer** — no real pain, no budget, or the incumbent already covers it
  well. Saying no protects a solo operation.

**Red flags:** no real file forthcoming (low commitment); the "mess" is actually fine;
data so sensitive it needs legal/DPA work before you touch it; a Tier-2 incumbent
with no export path.

## 10. Calibration rules to apply every time (learned from the HAL specimen)
These came from profiling a real 5,793-row master and generalise to any source:
- **Import controlled vocabularies; don't re-type them.** Where the source has its own
  code tables, they're high-confidence.
- **De-dup even a "clean" master.** Normalise (case-fold + collapse whitespace +
  neutralise punctuation/hyphens) before comparing.
- **Duplicate description ≠ duplicate item.** Compare description *plus* classification
  context; surface "same item, different category" for review — never auto-merge.
- **Never assume completeness.** Fields your features need (e.g. reorder points for
  alerts) are often blank in the source and must be *captured* during onboarding.
- **Preserve the source's own key/code** as an external reference alongside our UUID.

## 11. What a new hire needs to run this
- This playbook + `profile_source.py` + the shape table (§6) and segment config (§8).
- The discovery question bank (§4) and artifact script (§5).
- Authority boundary: AI drafts; a human confirms every merge and every external
  action. Nothing reaches the source of truth unconfirmed.
- Escalate to engineering only when the profile reveals a **new shape** not in §6 —
  that's the rare case that needs a new adapter, not a config.
