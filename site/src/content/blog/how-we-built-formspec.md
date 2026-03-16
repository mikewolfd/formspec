---
title: "Three weeks from research to runtime"
description: "Formspec was built as a chain of formal models — research into specs, specs into schemas, schemas into implementations. Here's how we did it in three weeks, and what we learned about AI-driven specification work."
date: 2026-03-16
tags: ["process", "specification", "deep-dive"]
author: "Formspec Team"
---

Most software projects start with code. A prototype, a spike, something to see if the idea holds together. We did it backwards — started with research and didn't write anything executable for the first week. Three weeks later we had 7 formal specifications, 12 JSON schemas, two reference implementations, a conformance test suite, a static linter, an MCP server, a web component, and a visual studio.

The key bet: invest most of the effort at the top of the chain — getting the research and specification right — and let formality propagate downward. The code is the last mile, not the starting point.

## The chain

The project is organized as a sequence of formal models, each derived from the one before:

```
Research (prior-art analysis, feature extraction)
    |
Specification (normative prose, behavioral semantics)
    |
Schemas (structural contracts, JSON Schema)
    |
Reference implementations (TS engine, Python evaluator)
    |
Tooling interfaces (core, studio-core, MCP)
    |
Applications (web component, studio)
```

Each layer constrains the next. This matters especially for AI-assisted development. AI is effective at working within constraints but unreliable at inventing them. Formal models provide the constraints. Hand the AI a precise spec and a schema, and it produces correct implementations. Hand it a vague idea and it produces plausible-looking code with subtle bugs.

## Starting from existing standards

Before writing any spec, we wrote a research prompt. Read XForms, SHACL, and FHIR R5. Understand what's essential versus incidental. Synthesize a JSON-native form standard that handles 35 requirements drawn from a real federal grant reporting system — financial fields with decimal precision, conditional visibility with non-relevant data exclusion, multi-level validation, saving incomplete work without being blocked by validation, prior-year comparison rules.

We gave the same prompt to three LLM providers:

| Provider | Proposed Name | Character |
|----------|---------------|-----------|
| Claude | Universal Declarative Forms (UDF) | Specification-grade, precise, structurally complete |
| Gemini | Universal Declarative Form Architecture (UDFA) | Academic, thorough, execution-narrative style |
| GPT | JSON Declarative Form Model (JDFM) | Pragmatic, opinionated, strong on edge cases |

All three converged on the same core architecture: instance/bind/shape separation, reactive dependency graphs, structured validation with severity levels, canonical versioning with response pinning. The convergence probably reflects real structure in the training data more than independent confirmation — but it gave us confidence in the direction.

The divergences were equally useful. GPT's proposal introduced the `whenExcluded` policy. Claude's had the cleanest spec structure. Gemini's execution narratives influenced our worked examples. We cherry-picked from each.

Then we went back to the actual W3C and HL7 specifications. Summarized approximations aren't good enough for normative semantics. Using targeted deep-dives, we decomposed each specification into independently testable behavioral requirements — 517 distinct features across six standards — and classified every one against our synthesis. ([Why another form thing?](/blog/why-another-form-thing) has the full scorecard and prior-art breakdown.)

## Writing the spec before writing the code

With the synthesis validated, we wrote specifications. Not code — prose. W3C-style normative language with MUST/SHOULD/MAY semantics per RFC 2119.

The core specification alone covers field types, binds, FEL grammar, reactive dependency graphs, validation shapes, severity semantics, non-relevant data exclusion, repeatable groups, secondary instances, composition, extension points, and conformance levels. Additional specs cover the FEL grammar formally, themes, 33 built-in components, a mapping DSL for bidirectional transforms, an extension registry, and a changelog format.

Thousands of words of specification prose before we had a working parser. This felt slow at the time. It turned out to be the single best investment in the entire project.

## Schemas as the structural contract

The specs define behavior. JSON Schemas define structure. We wrote schemas for every artifact type — definitions, responses, validation reports, themes, components, mappings, registries, changelogs, FEL function catalogs. Nine schemas total.

What schemas can encode — required fields, valid types, nesting constraints — they own completely. What they can't encode — "calculated fields are implicitly readonly," "non-relevant groups cascade to all children" — stays in the spec prose. Clean separation: schemas handle structure, specs handle behavior.

We also built a generation pipeline. BLUF summaries get injected into canonical specs. Schema reference blocks are auto-generated and embedded in the markdown. And `.llm.md` files — compressed versions of each specification stripped of verbose explanations, designed to fit efficiently into an LLM context window. Auto-generated, never hand-edited. They're what an AI agent reads when it needs the rules of FEL or the semantics of non-relevant data.

## Two independent implementations

This is where the formal model chain pays off.

The **TypeScript engine** is the client-side runtime — reactive state management with Preact Signals, Chevrotain-based FEL parser and interpreter, dependency graph construction and topological evaluation.

The **Python evaluator** is the server-side runtime — complete FEL parser and evaluator, static linter with ~40 diagnostic codes across 9 validation passes, mapping adapters for JSON, XML, and CSV.

The Python implementation was written from the specification, not from the TypeScript source. Two independent implementations of the same formal model. When we find a discrepancy between them, the debugging process is straightforward: read the spec section, determine which implementation is wrong, fix it. Not "argue about what the intended behavior was." The spec already settled that.

This is the property that matters most for the target use cases. When a federal agency needs to know that client-side validation and server-side validation produce identical results, "we tested it" is less convincing than "they were independently implemented from the same normative specification and verified against a shared conformance suite."

## Tooling layers

Reference implementations are libraries. To make them useful, we built three layers on top.

**formspec-core** — project management with 17 handler-based mutations. Add a field, remove a group, update a bind. Normalization, component document management, page resolution, theme cascade.

**formspec-studio-core** — 51 authoring helper methods on top of formspec-core. Each helper pre-validates inputs, dispatches to the right handlers, and returns structured results.

**formspec-mcp** — an MCP server that exposes the authoring helpers as AI-callable tools. Any LLM that supports tool use can build Formspec forms without fine-tuning or special training, because the schemas define what valid calls look like. The AI works through the model chain, constrained at every step.

## The applications

**formspec-webcomponent** — a `<formspec-render>` custom element with 33 built-in components. Drop a definition JSON into the element and get a working form.

**formspec-studio** — a visual form builder powered by the MCP server. Chat-driven authoring with live preview. You describe what you want, the AI expresses it as structured tool calls, and the studio renders the result in real-time. The AI never generates raw JSON — it works through the model chain.

## What we learned

**The models aren't documentation — they're the product.** A spec tells you what correct behavior is. A schema tells you what valid structure looks like. An ADR tells you what was decided and why. Code alone doesn't carry any of this. It shows *what* was built, not *why* those choices were made or *what invariants must hold*.

**AI is a force multiplier for formal work.** Reading six standards, extracting 517 features, writing normative prose, generating schemas, building two implementations — none of this is superhuman. It's just a lot of careful work. AI compressed three months of careful work into three weeks by handling the volume while humans handled the judgment.

**Start at the top of the chain.** The spec-first approach felt like it was slowing us down during week one. By week three, every implementation decision was faster because the hard questions were already answered. The code is the last mile.

Three weeks from first research prompt to a working visual studio. Start with the models. The code follows.
