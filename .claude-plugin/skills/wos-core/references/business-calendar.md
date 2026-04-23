# WOS Business Calendar Sidecar v1.0 — Reference Map

> `wos-spec/specs/sidecars/business-calendar.md` — 249 lines — machine-oriented section index

## Overview

The WOS Business Calendar Sidecar defines the business-day, holiday, and operating-hours model that WOS processors use for SLA evaluation and temporal parameter resolution. Government workflows measure deadlines in business days, not wall-clock time: a 30-day response window excludes weekends and federal holidays, and operating hours constrain when timers advance. The kernel's timer mechanism (Kernel S9.7) and the go…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Business Calendar Sidecar v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   1. Introduction | Navigate here for this subsection. |
| L35 |     1.1 Purpose | Navigate here for this subsection. |
| L50 |     1.2 Scope | Navigate here for this subsection. |
| L56 |     1.3 Notational Conventions | Navigate here for this subsection. |
| L62 |   2. Document Structure | Navigate here for this subsection. |
| L66 |     2.1 Required Properties | Navigate here for this subsection. |
| L75 |     2.2 Optional Properties | Navigate here for this subsection. |
| L90 |   3. Work Week | Navigate here for this subsection. |
| L94 |     3.1 Day Names | Navigate here for this subsection. |
| L98 |     3.2 Standard Work Week | Navigate here for this subsection. |
| L102 |     3.3 Evaluation | Navigate here for this subsection. |
| L111 |   4. Holiday Schedule | Navigate here for this subsection. |
| L113 |     4.1 Holiday Properties | Navigate here for this subsection. |
| L122 |     4.2 Fixed vs. Floating Holidays | Navigate here for this subsection. |
| L135 |     4.3 Observed Holidays | Navigate here for this subsection. |
| L141 |   5. Operating Hours | Navigate here for this subsection. |
| L143 |     5.1 Purpose | Navigate here for this subsection. |
| L147 |     5.2 Properties | Navigate here for this subsection. |
| L154 |     5.3 Evaluation | Navigate here for this subsection. |
| L162 |   6. SLA Composition | Navigate here for this subsection. |
| L164 |     6.1 Business-Day SLA Evaluation | Navigate here for this subsection. |
| L173 |     6.2 Temporal Parameter Resolution Composition | Navigate here for this subsection. |
| L179 |   7. Multi-Calendar Scenarios | Navigate here for this subsection. |
| L183 |     7.1 Calendar Selection Algorithm | Navigate here for this subsection. |
| L196 |     7.2 Composition When Multiple Calendars Apply | Navigate here for this subsection. |
| L204 |     7.3 Worked Example: Multi-State Benefits Workflow | Navigate here for this subsection. |
| L220 |   8. Conformance | Navigate here for this subsection. |
| L222 |     8.1 Processor Requirements | Navigate here for this subsection. |
| L232 |     8.2 Absence Behavior | Navigate here for this subsection. |
| L238 |   References | Navigate here for this subsection. |
| L240 |     Normative References | Navigate here for this subsection. |
| L246 |     Informative References | Navigate here for this subsection. |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
