# WOS Synth Trace — Schema Reference Map

> `wos-spec/schemas/synth/wos-synth-trace.schema.json` — 289 lines — JSON Schema property index

## Overview

Structured execution trace emitted by the wos-synth synthesis loop. Records every iteration of the generate-then-repair loop the LLM authoring engine ran for a single document: the model's raw attempt, the lint findings observed against it, the conformance verdict (when a fixture was supplied), and the per-call token costs. The CLI's `wos-synth explain` command consumes this artifact, downstream tooling (wos-bench, regression dashboards) parses it for cost and convergence analysis, and external 

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| *(no top-level `properties`; inspect `oneOf` / `$defs` in the schema file)* | — | — |

## Key `$defs` (sample)

| Definition |
|------------|
| **ConformanceVerdict** |
| **IterationRecord** |
| **LintFinding** |
| **Severity** |
| **SynthOutcome** |
| **SynthOutcomeConverged** |
| **SynthOutcomeUnconverged** |
| **SynthTrace** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
