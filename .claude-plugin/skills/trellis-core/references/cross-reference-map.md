# Trellis Cross-Reference Map — Reference Map

> `trellis/specs/cross-reference-map.md` — 97 lines, ~6 KB — Trellis non-normative companion; upstream rehoming index after Plan 3 (2026-04-15)

## Overview

This document is a **living implementation index**, not normative Trellis prose. It records where each concept went when content was **removed from Trellis unified-ledger matrices** after the three-spec dependency direction **Formspec ← WOS ← Trellis** was formalized: Trellis depends on WOS; WOS depends on Formspec; normative definitions for “rehomed” obligations appear in those upstream specs unless explicitly reinstated in Trellis (e.g. **TR-OP-130**). Use it when tracing **ULCR** / **ULCOMP-R** IDs, **assurance vs disclosure**, **respondent history**, **user-held reuse**, **lifecycle / legal hold / sealing**, **workflow sidecar** semantics, or **version-pinned response** validation back to their authoritative sections.

## Section Map

### Front matter and Purpose (Lines 1–8)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| — | *(title block)* | Declares document name, **living** status, and dependency context (Plan 3, three-spec direction). | living document, Plan 3, Formspec ← WOS ← Trellis | You need the document’s role relative to normative Trellis specs. |
| 1 | Purpose | States the map records **upstream homes** for concepts removed from Trellis specs; explicitly **not normative**. | upstream home, removed from Trellis, implementation aid, not normative | Deciding whether this file or a Trellis/WOS/Formspec spec is authoritative. |

### Removed matrix rows (Lines 9–73)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2 | Removed ULCR rows | Table mapping **ULCR-063, 080, 081, 091, 112** from `unified-ledger-requirements-matrix.md` to Formspec Respondent Ledger, WOS Assurance, or WOS Governance sections; ULCR-091 notes **rescoping** to ledger-specific crypto vs generic lifecycle upstream. | ULCR-063, ULCR-080, ULCR-081, ULCR-091, ULCR-112, disclosure vs assurance, user-held reuse, respondent history, cryptographic lifecycle, Invariant 6 | Tracing a **ULCR** ID dropped from the UL matrix. |
| 3 | Removed ULCOMP-R rows | Table mapping **ULCOMP-R-067** through **-197** from `unified-ledger-companion-requirements-matrix.md` to Respondent Ledger, WOS Assurance, WOS Governance, or **TR-OP-130** reinstatement in Trellis requirements. | ULCOMP-R-067–087, ULCOMP-R-135–142, ULCOMP-R-155–162, ULCOMP-R-181–188, ULCOMP-R-189–197, TR-OP-130, versioned registries | Tracing a **ULCOMP-R** ID; workflow sidecar vs forms sidecar split. |

### Summary and usage (Lines 75–97)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Concept-to-home map (summary) | Single table aggregating concepts (L1–L4 taxonomy, subject continuity, Invariant 6, attestation, legal disclaimer, signatures, `privacyTier`, **custodyHook** / Posture Declaration seam, lifecycle, quorum delegation, VP validation, etc.) to their **normative** section pointers. | assuranceLevel, privacyTier, custodyHook, subject continuity, VP-01, VP-02, TR-OP-130, Operational Companion §9, §11 | Quick lookup without scanning both removal tables. |
| 5 | Using this map | Instructs implementers: Trellis spec prose holds explicit cross-refs; this file is the **alphabetical / tabular index**. | explicit cross-reference, alphabetical index | Linking Trellis prose to this index in docs or tooling. |

## Cross-References (authority order)

Order: **Formspec** (data / respondent / core semantics) → **WOS** (kernel hooks, assurance, governance) → **Trellis** (reinstated or operational companion seams). Within WOS, **Kernel** before layer specs when both appear.

### Formspec

- **Respondent Ledger** — §6.4 Actor object (`assuranceLevel`, `privacyTier`); §6.6 Identity attestation object (`assuranceLevel`, `privacyTier`, provider-neutral normalization); §6.6A identity and implementation decoupling (subject continuity); §6.7 (with §6.6A for user-held reuse, respondent history, forms sidecar semantics); §13 integrity checkpoints (`signature`, §13.2 minimum fields, §13.4 behavior); §15A.3 (Profile C, legal attestation commentary).
- **Core** — §6 **VP-01**, **VP-02** (version-pinned response validation).

### WOS

- **Assurance** — §2 assurance taxonomy (L1–L4); §3 subject continuity, identity/attestation semantics, authentication/signing; §4 **Invariant 6** (disclosure posture ≠ assurance level); §5 provider-neutral attestation; §6 legal-sufficiency disclaimer (ledger spec does not mirror a standalone §2.4).
- **Governance** — §2.9 schema upgrade (lifecycle); §3–4, §8, §11 due process, review, rejection/remediation, delegation, operational vs canonical ordering, provenance/export honesty; §4.9 quorum-based delegation (N-of-M); §7.15 legal hold, retention, sealing / precedence (with §2.9 for lifecycle facts).
- **Kernel** — §10.5 `custodyHook` (Posture Declaration seam — delegates to Trellis Operational Companion).

### Trellis

- **Requirements matrix** — `specs/trellis-requirements-matrix.md` §2.14 **TR-OP-130** (versioned registries / operator complement to Invariant #6); **ULCOMP-R-197** reinstated here, not upstream to WOS Appendix A.
- **Operational Companion** — §9, §11 (custody and posture object definition per Kernel `custodyHook`).

### Source artifacts (historical provenance only)

- `unified-ledger-requirements-matrix.md` (ULCR removals).
- `unified-ledger-companion-requirements-matrix.md` (ULCOMP-R removals).

## Quick Reference Tables

| Artifact | Role |
|----------|------|
| §2 Removed ULCR rows | 5 ULCR IDs → new homes (Formspec RL, WOS Assurance, WOS Governance). |
| §3 Removed ULCOMP-R rows | ULCOMP-R-067–197 → homes; **-197** special case → **TR-OP-130**. |
| §4 Concept-to-home map | Denormalized concept → single upstream pointer set. |

## Critical Behavioral Rules

1. **This map is not normative** — it indexes where obligations live after matrix edits; Trellis/WOS/Formspec spec text governs behavior.
2. **Dependency direction** — **Formspec ← WOS ← Trellis**: Trellis does not redefine rehomed concepts; implement against the cited upstream sections.
3. **ULCR-091 rescoping** — Ledger-specific crypto facts stay in scope; generic lifecycle (retention, hold, archival, sealing, schema upgrade) is **WOS Governance** (§2.9, §7.15), not duplicated in Trellis matrices.
4. **Invariant 6** — Disclosure posture and assurance level **must not be conflated**; normative home **WOS Assurance §4**; ledger fields **Formspec Respondent Ledger §6.4 / §6.6** (`assuranceLevel`).
5. **Subject continuity** — **WOS Assurance §3** plus **Respondent Ledger §6.6A** (decoupling identity implementation from assurance narrative).
6. **User-held reuse and respondent history** — Large family of ULCOMP-R rows → **Respondent Ledger §6.6A and §6.7** consistently (reuse binding, canonical vs user-held, history as projection, materiality, export honesty).
7. **Workflow sidecar (ULCOMP-R-189–196)** — Operational vs canonical workflow mapping, review/approval/conflict/provenance families → **WOS Governance §§3–4, §8, §11** (not Respondent Ledger).
8. **Identity, attestation, user signing (ULCOMP-R-135–138)** — Provider-neutral and signing semantics → **WOS Assurance §3** (and §2/§4 where cross-listed).
9. **Lifecycle, sealing, retention vs hold (ULCOMP-R-155–162, ULCOMP-R-161–162)** — **WOS Governance §2.9, §7.15**; compliance-relevant operations as canonical facts per cited sections.
10. **Posture Declaration / custody** — **WOS Kernel §10.5 `custodyHook`** delegates posture/custody object definition to **Trellis Operational Companion §9 and §11**.
11. **Authored signatures** — **Respondent Ledger §13** (integrity checkpoints); there is **no** freestanding §6.8 for authored-signature semantics in the map’s pointers.
12. **`privacyTier` / disclosure posture** — **Respondent Ledger §6.4 and §6.6**; not isolated under a standalone §6.6 heading name in the index prose.
13. **Version-pinned validation** — **Formspec Core §6 VP-01, VP-02**.
14. **ULCOMP-R-197 / versioned registries** — Originally marked removed; **reinstated as TR-OP-130** in `trellis-requirements-matrix.md` §2.14 — historical note in source explains unsound “WOS Appendix A” rationale; Trellis owns this obligation.
15. **Using Trellis specs day-to-day** — Prefer **inline cross-references in Trellis spec prose**; use this file as the **tabular index** when jumping from ULCR/ULCOMP-R IDs or concept names.
