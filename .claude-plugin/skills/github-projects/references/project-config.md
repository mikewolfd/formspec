# Formspec GitHub Project — Full Configuration Reference

Project location and custom field option IDs are in the parent SKILL.md. This file contains supplementary configuration: built-in fields, git remotes, and labels.

## Git Remotes

The local repo has two remotes pointing to the same upstream:

| Remote | URL | Notes |
|--------|-----|-------|
| `origin` (fetch) | `git@github.com:Formspec-org/formspec.git` | Personal fork — SSH |
| `origin` (push) | `https://github.com/Formspec-org/formspec` | Org repo — HTTPS |
| `focus` | `https://github.com/Formspec-org/formspec` | Org repo — explicit |

The push URL for `origin` goes to the org repo, but the fetch URL points to the personal fork. Always use `--repo Formspec-org/formspec` with `gh` commands to target the org repo directly.

## Built-in Project Fields

These are standard GitHub Project fields (not editable via `gh project item-edit`):

| Field | ID | Type |
|-------|----|------|
| Title | `PVTF_lADOAtpwPs4BSa-Pzg_9eaY` | ProjectV2Field |
| Assignees | `PVTF_lADOAtpwPs4BSa-Pzg_9eac` | ProjectV2Field |
| Labels | `PVTF_lADOAtpwPs4BSa-Pzg_9eak` | ProjectV2Field |
| Linked pull requests | `PVTF_lADOAtpwPs4BSa-Pzg_9eao` | ProjectV2Field |
| Milestone | `PVTF_lADOAtpwPs4BSa-Pzg_9eas` | ProjectV2Field |
| Repository | `PVTF_lADOAtpwPs4BSa-Pzg_9eaw` | ProjectV2Field |
| Reviewers | `PVTF_lADOAtpwPs4BSa-Pzg_9ea4` | ProjectV2Field |
| Parent issue | `PVTF_lADOAtpwPs4BSa-Pzg_9ea8` | ProjectV2Field |
| Sub-issues progress | `PVTF_lADOAtpwPs4BSa-Pzg_9ebA` | ProjectV2Field |

## Custom Field Full IDs (for GraphQL)

When using the GraphQL `updateProjectV2ItemFieldValue` mutation, use the full field IDs:

| Field | Full ID |
|-------|---------|
| Status | `PVTSSF_lADOAtpwPs4BSa-Pzg_9eag` |
| Layer | `PVTSSF_lADOAtpwPs4BSa-Pzg_9eeI` |
| Priority | `PVTSSF_lADOAtpwPs4BSa-Pzg_9eeM` |

## Labels (on Formspec-org/formspec)

Default GitHub labels only — no custom labels defined:

bug, documentation, duplicate, enhancement, good first issue, help wanted, invalid, question, wontfix

## Refreshing Configuration

If project fields change (new options added, fields renamed), regenerate the config:

```bash
gh project field-list 8 --owner Formspec-org --format json
```
