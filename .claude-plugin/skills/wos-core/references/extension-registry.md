# WOS Extension Registry v1.0 — Reference Map

> `wos-spec/specs/registry/extension-registry.md` — 373 lines — machine-oriented section index

## Overview

The WOS Extension Registry is a JSON document that catalogs the named extension seams a WOS deployment exposes. The kernel defines six seams (Kernel §10) and treats each as an opaque attachment point — higher layers (Governance, AI Integration, Advanced) and vendors bind concrete shapes to those seams. Until now, the catalog of which seams exist, which are stable enough to depend on, and which vendor namespaces are c…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Extension Registry v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L29 |   Status of This Document | Navigate here for this subsection. |
| L35 |   1. Document Structure | Navigate here for this subsection. |
| L39 |     1.1 Root Properties | Navigate here for this subsection. |
| L51 |     1.2 RegistryEntry Properties | Navigate here for this subsection. |
| L71 |   2. The Six Kernel Seams | Navigate here for this subsection. |
| L75 |     2.1 actorExtension | Navigate here for this subsection. |
| L95 |     2.2 contractHook | Navigate here for this subsection. |
| L114 |     2.3 provenanceLayer | Navigate here for this subsection. |
| L133 |     2.4 lifecycleHook | Navigate here for this subsection. |
| L153 |     2.5 custodyHook | Navigate here for this subsection. |
| L176 |     2.5.1 WOS-owned custody append identifiers | Navigate here for this subsection. |
| L216 |     2.6 vendor-extension | Navigate here for this subsection. |
| L237 |   3. Lifecycle Semantics | Navigate here for this subsection. |
| L241 |     3.1 The Four Stages | Navigate here for this subsection. |
| L250 |     3.2 Transition Rules | Navigate here for this subsection. |
| L261 |     3.3 What Lifecycle Does NOT Promise | Navigate here for this subsection. |
| L268 |   4. Composition Semantics | Navigate here for this subsection. |
| L274 |     4.1 The Three Modes | Navigate here for this subsection. |
| L282 |     4.2 Defaults | Navigate here for this subsection. |
| L290 |     4.3 Conflicts | Navigate here for this subsection. |
| L296 |   5. Discovery and Resolution | Navigate here for this subsection. |
| L300 |     5.1 Discovery | Navigate here for this subsection. |
| L310 |     5.2 Resolution | Navigate here for this subsection. |
| L319 |     5.3 Following `replacedBy` | Navigate here for this subsection. |
| L327 |   6. Conformance | Navigate here for this subsection. |
| L331 |     6.1 Required Behaviors | Navigate here for this subsection. |
| L342 |     6.2 Absence Behavior | Navigate here for this subsection. |
| L346 |     6.3 Warnings vs Errors | Navigate here for this subsection. |
| L362 |   References | Navigate here for this subsection. |
| L364 |     Normative | Navigate here for this subsection. |
| L369 |     Informative | Navigate here for this subsection. |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
