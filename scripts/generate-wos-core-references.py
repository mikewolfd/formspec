#!/usr/bin/env python3
"""Generate wos-core skill reference maps from canonical WOS specs and schemas."""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WOS = REPO / "wos-spec"
OUT = REPO / ".claude-plugin" / "skills" / "wos-core" / "references"

SPEC_REF_OVERRIDES: dict[str, str] = {
    "specs/kernel/spec.md": "kernel.md",
    "specs/governance/workflow-governance.md": "governance.md",
}

SCHEMA_REF_NAMES: dict[str, str] = {
    "wos-kernel.schema.json": "kernel.md",
    "wos-workflow-governance.schema.json": "governance.md",
    "wos-ai-integration.schema.json": "ai-integration.md",
    "wos-advanced.schema.json": "advanced.md",
    "wos-policy-parameters.schema.json": "policy-parameters.md",
    "wos-business-calendar.schema.json": "business-calendar.md",
    "wos-case-instance.schema.json": "case-instance.md",
}


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")


def spec_headings(path: Path) -> tuple[list[tuple[int, int, str]], int]:
    lines = read_text(path).splitlines()
    heads: list[tuple[int, int, str]] = []
    for i, line in enumerate(lines, 1):
        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            heads.append((i, len(m.group(1)), m.group(2).strip()))
    return heads, len(lines)


def abstract_blurb(path: Path) -> str:
    text = read_text(path)
    m = re.search(r"## Abstract\s*\n+([\s\S]*?)(?=\n## |\Z)", text)
    if not m:
        return f"Canonical prose for `{path.relative_to(REPO)}`."
    body = m.group(1).strip()
    body = re.sub(r"\s+", " ", body)
    return body[:420] + ("…" if len(body) > 420 else "")


def title_line(path: Path) -> str:
    for line in read_text(path).splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem.replace("-", " ").title()


def spec_reference_content(rel: str, path: Path) -> str:
    heads, n = spec_headings(path)
    title = title_line(path)
    blurb = abstract_blurb(path)
    rel_path = f"wos-spec/{rel}"

    rows: list[str] = []
    for line_no, level, heading in heads:
        if level > 3:
            continue
        indent = "  " * (level - 1)
        rows.append(f"| L{line_no} | {indent}{heading} | Navigate here for this subsection. |")

    section_table = "\n".join(rows[:45])
    if len(rows) > 45:
        section_table += "\n| … | *(additional subsections omitted)* | |"

    return f"""# {title} — Reference Map

> `{rel_path}` — {n} lines — machine-oriented section index

## Overview

{blurb}

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
{section_table}

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
"""


def list_enum_schema(node: object) -> list[str] | None:
    if isinstance(node, dict) and "enum" in node:
        vals = node["enum"]
        if isinstance(vals, list):
            return [str(v) for v in vals]
    return None


def schema_rows(schema: dict) -> tuple[str, str, str]:
    props = schema.get("properties") or {}
    defs = schema.get("$defs") or {}
    title = str(schema.get("title") or "")
    desc = str(schema.get("description") or "").strip().split("\n")[0][:500]

    prop_lines = []
    for name in sorted(props.keys())[:35]:
        p = props[name]
        typ = "object"
        if isinstance(p, dict):
            if "$ref" in p:
                typ = p["$ref"].split("/")[-1]
            elif "type" in p:
                t = p["type"]
                typ = t if isinstance(t, str) else json.dumps(t)
            en = list_enum_schema(p)
            if en:
                typ = f"enum({', '.join(en[:6])}{'…' if len(en) > 6 else ''})"
        prop_lines.append(f"| `{name}` | {typ} | See schema for constraints. |")

    def_lines = []
    for name in sorted(defs.keys())[:40]:
        def_lines.append(f"| **{name}** |")

    if prop_lines:
        props_md = "\n".join(prop_lines)
    else:
        props_md = "| *(no top-level `properties`; inspect `oneOf` / `$defs` in the schema file)* | — | — |"
    defs_md = "\n".join(def_lines) if def_lines else "| *(none)* |"

    return title, desc, props_md, defs_md


def schema_reference_content(rel: str, path: Path) -> str:
    schema = json.loads(read_text(path))
    title, desc, props_md, defs_md = schema_rows(schema)
    rel_path = f"wos-spec/{rel}"
    n = len(read_text(path).splitlines())
    doc_title = title or path.stem

    return f"""# {doc_title} — Schema Reference Map

> `{rel_path}` — {n} lines — JSON Schema property index

## Overview

{desc or "JSON Schema constraints for the WOS artifact type named in the title."}

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
{props_md}

## Key `$defs` (sample)

| Definition |
|------------|
{defs_md}

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
"""


def area_label(rel: str) -> str:
    parts = rel.split("/")
    bucket = parts[1] if len(parts) > 1 and parts[0] in ("specs", "schemas") else parts[0]
    return {
        "kernel": "L0: Kernel",
        "governance": "L1: Governance",
        "ai": "L2: AI Integration",
        "advanced": "L3: Advanced",
        "assurance": "Assurance",
        "companions": "Companions",
        "profiles": "Profiles",
        "registry": "Extension registry",
        "sidecars": "Sidecars",
        "conformance": "Conformance tooling",
        "lint": "Lint tooling",
        "mcp": "MCP tooling",
        "synth": "Synth tooling",
    }.get(bucket, bucket.replace("-", " ").title())


def write_skill_md(spec_paths: list[Path], schema_paths: list[Path]) -> None:
    skill = OUT.parent / "SKILL.md"
    n_specs = len(spec_paths)
    n_schemas = len(schema_paths)

    spec_links: list[str] = []
    for path in spec_paths:
        rel = path.relative_to(WOS).as_posix()
        ref_name = SPEC_REF_OVERRIDES.get(rel, path.name)
        spec_links.append(
            f"- [{ref_name}](references/{ref_name}) — canonical `wos-spec/{rel}`"
        )

    schema_links: list[str] = []
    for path in schema_paths:
        rel = path.relative_to(WOS).as_posix()
        out_name = SCHEMA_REF_NAMES.get(
            path.name, path.name.replace(".schema.json", ".md").replace("wos-", "")
        )
        schema_links.append(
            f"- [{path.name} → references/schemas/{out_name}](references/schemas/{out_name}) — `wos-spec/{rel}`"
        )

    file_map_rows: list[str] = []
    for path in spec_paths:
        rel = path.relative_to(WOS).as_posix()
        ref_name = SPEC_REF_OVERRIDES.get(rel, path.name)
        file_map_rows.append(
            f"| {area_label(rel)} | Spec | `wos-spec/{rel}` | [Section map](references/{ref_name}) |"
        )
    for path in schema_paths:
        rel = path.relative_to(WOS).as_posix()
        out_name = SCHEMA_REF_NAMES.get(
            path.name, path.name.replace(".schema.json", ".md").replace("wos-", "")
        )
        file_map_rows.append(
            f"| {area_label(rel)} | Schema | `wos-spec/{rel}` | [Property map](references/schemas/{out_name}) |"
        )

    spec_links_txt = "\n".join(sorted(spec_links))
    schema_links_txt = "\n".join(sorted(schema_links))
    file_map_txt = "\n".join(file_map_rows)

    content = f"""# WOS Specification Navigator (wos-core)

Navigate the Workflow Orchestration Standard (WOS) specification suite. This skill provides structured access to the {n_specs} canonical specifications and {n_schemas} JSON Schemas under `wos-spec/`, plus companion `.llm.md` distillations where present.

## Metadata
- **Version:** 1.1.0
- **Authors:** Formspec Working Group
- **Status:** Production
- **Scope:** WOS Kernel (L0), Governance (L1), AI Integration (L2), Advanced Governance (L3), Assurance, Profiles, Sidecars, Companions, registry, and tooling schemas (conformance, lint, MCP, synth).

## Core Objective
Enable the AI to query the WOS specification with high precision, mapping requirements to specific chapters, understanding the layered processing model, and resolving inter-spec dependencies across the four vertical layers.

---

## Architectural Navigation (The Four Layers)

WOS is organized into a four-layer vertical stack. Each layer targets a "Kernel Document" via a sidecar pattern.

| Layer | Name | Primary Spec (canonical) | Primary Schema | Key Seams |
|-------|------|--------------------------|----------------|-----------|
| **L0** | **Kernel** | `wos-spec/specs/kernel/spec.md` | `wos-spec/schemas/kernel/wos-kernel.schema.json` | `topology`, `caseState`, `actorModel` |
| **L1** | **Governance** | `wos-spec/specs/governance/workflow-governance.md` | `wos-spec/schemas/governance/wos-workflow-governance.schema.json` | `lifecycleHook`, `contractHook`, `provenanceLayer` |
| **L2** | **AI Integration** | `wos-spec/specs/ai/ai-integration.md` | `wos-spec/schemas/ai/wos-ai-integration.schema.json` | `actorExtension`, `deonticConstraints`, `autonomyLevels` |
| **L3** | **Advanced** | `wos-spec/specs/advanced/advanced-governance.md` | `wos-spec/schemas/advanced/wos-advanced.schema.json` | `constraintZones` (DCR), `equityGuardrails` |

### Sidecars, profiles, and companions
- **Sidecars:** `PolicyParameters`, `BusinessCalendar`, `NotificationTemplate`, plus kernel-adjacent metadata sidecars.
- **Profiles:** `Integration`, `Semantic`, and `Signature` parallel seam documents.
- **Runtime companion:** execution model for layered evaluation (`specs/companions/runtime.md`).
- **Tooling schemas:** conformance traces, MCP tool catalog, lint diagnostics, synth traces.

---

## Decision Tree: Where to Look

1. **Topology, state, or basic actors?** → `wos-spec/specs/kernel/spec.md` (see [kernel.md](references/kernel.md))
2. **Due process, protocols, or human governance?** → `wos-spec/specs/governance/workflow-governance.md` (see [governance.md](references/governance.md))
3. **Agents, autonomy, or deontic constraints?** → `wos-spec/specs/ai/ai-integration.md` (see [ai-integration.md](references/ai-integration.md))
4. **DCR zones, verification, or fairness?** → `wos-spec/specs/advanced/advanced-governance.md` (see [advanced-governance.md](references/advanced-governance.md))
5. **Processor behavior or evaluation order?** → `wos-spec/specs/companions/runtime.md` (see [runtime.md](references/runtime.md))
6. **Temporal parameters?** → `wos-spec/specs/governance/policy-parameters.md` (see [policy-parameters.md](references/policy-parameters.md))
7. **SLAs, calendars, holds?** → `wos-spec/specs/sidecars/business-calendar.md` and governance service-level material in `workflow-governance.md`
8. **Assurance posture (separate from impact level)?** → `wos-spec/specs/assurance/assurance.md` (see [assurance.md](references/assurance.md))
9. **Extension discovery?** → `wos-spec/specs/registry/extension-registry.md` (see [extension-registry.md](references/extension-registry.md))

---

## Cross-Tier Integration Points (The Seams)

| Seam ID | Definition Spec | Consumed By | Semantics |
|---------|-----------------|-------------|-----------|
| `lifecycleHook` | Kernel §10.4 | All (L1–L3) | Logic triggered by transition tags (for example `determination`, `adverse-decision`). |
| `contractHook` | Kernel §10.2 | L1, L2 | Data validation pipelines and Formspec-as-validator cages. |
| `provenanceLayer` | Kernel §10.3 | All | Extension of Facts tier with Reasoning (L1), Counterfactual (L1), and Narrative (L2). |
| `actorExtension` | Kernel §10.1 | L2, L3 | Transformation of `actor` types into `agent` with registration and lifecycle. |
| `extensions` | Kernel §10.5 | L3 | Attachment of DCR Constraint Zones to compound states. |

---

## Reference Maps (LLM quick-links)

### Specification section maps

{spec_links_txt}

### Schema property maps

{schema_links_txt}

---

## Complete file map (`wos-spec`)

Each row links the canonical on-disk source to its generated reference navigator.

| Area | Kind | Source | Reference map |
|------|------|--------|---------------|
{file_map_txt}

---

## Normative Rules for LLM Reasoning

1. **Layered evaluation:** WOS is not additive; it is a layered sieve. A processor MUST evaluate L0 (if safe), then apply L1 filters, then L2 agents under L1 constraints.
2. **Sidecar binding:** Sidecars bind to the Kernel Document URL. If the URL does not match, the sidecar is ignored.
3. **Trust boundary:** AI agents (L2) are always outside the trust boundary. The WOS processor enforces constraints; the agent cannot weaken them.
4. **Semantic tags:** Logic in L1/L2 attaches to kernel tags (`determination`, `review`), not transition IDs, so governance survives topology changes.
5. **Formspec-as-validator:** Agent output is untrusted input. WOS MUST NOT implement custom validation if it can be expressed as a Formspec contract.
6. **Impact level caps:** Effective autonomy (L2) is capped by kernel `impactLevel`. `rights-impacting` defaults to `assistive`.
"""
    skill.write_text(content, encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "schemas").mkdir(parents=True, exist_ok=True)

    spec_paths = sorted(
        p
        for p in (WOS / "specs").rglob("*.md")
        if not p.name.endswith((".llm.md", ".bluf.md", ".semantic.md"))
    )

    for path in spec_paths:
        rel = path.relative_to(WOS).as_posix()
        out_name = SPEC_REF_OVERRIDES.get(rel, path.name)
        target = OUT / out_name
        target.write_text(spec_reference_content(rel, path), encoding="utf-8")

    schema_paths = sorted((WOS / "schemas").rglob("*.schema.json"))
    for path in schema_paths:
        rel = path.relative_to(WOS).as_posix()
        out_name = SCHEMA_REF_NAMES.get(path.name, path.name.replace(".schema.json", ".md").replace("wos-", ""))
        target = OUT / "schemas" / out_name
        target.write_text(schema_reference_content(rel, path), encoding="utf-8")

    write_skill_md(spec_paths, schema_paths)

    print(f"Wrote {len(spec_paths)} spec reference maps to {OUT}")
    print(f"Wrote {len(schema_paths)} schema reference maps to {OUT / 'schemas'}")
    print(f"Updated {OUT.parent / 'SKILL.md'}")


if __name__ == "__main__":
    main()
