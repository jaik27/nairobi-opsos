# Nairobi OpsOS — Project Documentation (Phase 1: Planning & Requirements)

This is the canonical knowledge base for Nairobi OpsOS. Everything here is
docs-as-code: it lives in `/docs`, versions with the codebase, and is kept current
by the automated doc-sync pipeline (see `DEVOPS_PLAYBOOK.md`).

## Reading order

| # | Document | Owner role | Answers |
|---|----------|-----------|---------|
| 00 | **README — docs index** (this file) | PM | Where everything lives |
| 01 | **Project Charter** | PM / Sponsor | *Why* the project exists, scope, objectives, governance |
| 02 | **PRD — Procurement & Stores Control Tower** | Product | *What* we build first and for whom |
| 03 | **Technical Design Spec (RFC)** | Engineering | *How* it is built — architecture, data, security, trade-offs |
| 04 | **Information Architecture** | Product / Design | *Where* things sit — navigation, entities, flows, screens |
| 05 | **Competitive Landscape Audit** | Strategy | *Against whom* we compete and how we win |
| 06 | **Risk Register** | PM | *What could go wrong* and our mitigations |
| 07 | **Segment Tooling & Integration Matrix** | Strategy / Product | *What each segment runs on* and how we integrate |
| 08 | **Segment Onboarding Playbook** | Ops / Delivery | *The repeatable method* to enter any new segment/client |
| — | **`profile_source.py`** | Tool | Run on any client export/sheet to profile it (used in stage 3 of doc 08) |

## Document status

| Doc | Status | Version | Last reviewed |
|-----|--------|---------|---------------|
| Charter | Draft for approval | 0.2 | 2026-06-24 |
| PRD | Draft for approval | 0.2 | 2026-06-24 |
| Tech Spec (RFC) | Draft — open for comments | 0.3 | 2026-06-24 |
| Information Architecture | Draft | 0.1 | 2026-06-23 |
| Competitive Audit | Draft | 0.2 | 2026-06-24 |
| Risk Register | Living document | 0.2 | 2026-06-24 |
| Segment Tooling & Integration Matrix | Reference | 0.2 | 2026-06-24 |
| Segment Onboarding Playbook | Operational method | 0.1 | 2026-06-24 |

## Conventions
- These are living documents. Material changes go through a pull request like code.
- An **RFC** is "open for comments" until decisions are ratified, then it becomes
  the design of record; subsequent changes are new RFCs or ADRs (`/docs/adr`).
- Decisions of consequence are also captured as short ADRs so the *why* is never lost.

## Project one-liner
A consulting-led, AI-automated operations platform that gives Kenyan SMEs and
mid-sized organisations enterprise-grade operational control — starting with a
Procurement & Stores Control Tower — at a fraction of the cost, time, and
complexity of traditional ERP, with KRA eTIMS and M-Pesa compliance built in.
