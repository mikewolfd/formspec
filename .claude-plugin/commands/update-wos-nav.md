---
description: Launch a swarm of agents to update all WOS spec/schema reference maps, then update SKILL.md
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: [--specs-only | --schemas-only | --skill-only | layer-name]
---

Update the wos-core skill's reference maps and SKILL.md navigator.

## Step 1: Discover source files

Discover all canonical WOS spec files and schema files that need reference maps.

**Specs** — scan `wos-spec/specs/` for `*.md` files, EXCLUDING `*.llm.md`, `*.bluf.md`, `*.semantic.md`:

```bash
find wos-spec/specs/ -name '*.md' ! -name '*.llm.md' ! -name '*.bluf.md' ! -name '*.semantic.md' | sort
```

**Schemas** — scan `wos-spec/schemas/` for `*.schema.json`:

```bash
find wos-spec/schemas/ -name '*.schema.json' | sort
```

## Step 2: Build the mapping table

Map each source file to its reference target in `.claude-plugin/skills/wos-core/references/`.

### Spec reference mappings

The reference filename should match the spec filename. If the spec filename is generic (e.g., `spec.md`), prefix with the parent directory name.

Known mappings:

| Source | Reference Target |
|--------|-----------------|
| `wos-spec/specs/kernel/spec.md` | `references/kernel.md` |
| `wos-spec/specs/governance/workflow-governance.md` | `references/governance.md` |
| `wos-spec/specs/ai/ai-integration.md` | `references/ai-integration.md` |
| `wos-spec/specs/advanced/advanced-governance.md` | `references/advanced-governance.md` |
| `wos-spec/specs/companions/runtime.md` | `references/runtime.md` |
| `wos-spec/specs/companions/lifecycle-detail.md` | `references/lifecycle-detail.md` |
| `wos-spec/specs/governance/policy-parameters.md` | `references/policy-parameters.md` |
| `wos-spec/specs/ai/drift-monitor.md` | `references/drift-monitor.md` |
| `wos-spec/specs/sidecars/business-calendar.md` | `references/business-calendar.md` |
| `wos-spec/specs/sidecars/notification-template.md` | `references/notification-template.md` |

For any newly discovered specs not in this table, derive the reference filename from the spec filename.

### Schema reference mappings

WOS schemas get individual reference files in `.claude-plugin/skills/wos-core/references/schemas/`.

Known mappings:

| Source Schema | Reference Target |
|---------------|-----------------|
| `wos-kernel.schema.json` | `schemas/kernel.md` |
| `wos-workflow-governance.schema.json` | `schemas/governance.md` |
| `wos-ai-integration.schema.json` | `schemas/ai-integration.md` |
| `wos-advanced.schema.json` | `schemas/advanced.md` |
| `wos-policy-parameters.schema.json` | `schemas/policy-parameters.md` |
| `wos-business-calendar.schema.json` | `schemas/business-calendar.md` |

## Step 3: Handle arguments

If `$ARGUMENTS` is provided:
- `--specs-only` → skip schemas, skip SKILL.md update
- `--schemas-only` → skip specs, skip SKILL.md update
- `--skill-only` → skip specs and schemas, only update SKILL.md
- Any other value → treat as a layer name filter (e.g., `kernel` only updates kernel-related references)

## Step 4: Launch the spec reference swarm

For each spec → reference mapping, launch a `wos-core:spec-reference-writer` agent **in parallel** using the Agent tool. Each agent gets this prompt:

```
Read the canonical WOS spec at `{source path}` and generate/update the reference map at `{target path}`.

Source: {absolute source path}
Target: {absolute target path}
```

## Step 5: Launch the schema reference swarm

After the spec agents complete, launch a `wos-core:schema-reference-writer` agent for each schema → reference mapping. Each agent gets this prompt:

```
Read the JSON schema at `{source path}` and generate/update the reference map at `{target path}`.

Source: {absolute source path}
Target: {absolute target path}
Type: wos-schema
```

## Step 6: Update SKILL.md

After ALL reference agents have completed, launch a single `wos-core:skill-updater` agent:

```
All WOS specification and schema reference maps have been updated. Read all reference files and update SKILL.md to reflect the current state.

Reference directories:
- Spec references: .claude-plugin/skills/wos-core/references/*.md
- Schema references: .claude-plugin/skills/wos-core/references/schemas/*.md
- SKILL.md: .claude-plugin/skills/wos-core/SKILL.md
```

## Step 7: Report results

After all agents complete, report:
- How many spec references were updated/created
- How many schema references were updated/created
- Whether SKILL.md was updated
- Any errors or issues from individual agents
