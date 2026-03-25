---
name: github-projects
description: This skill should be used when the user asks to create, update, list, close, or triage GitHub issues, manage epics and sub-issues, set project fields (priority, status, layer), move items on the board, or perform any GitHub Project board operation. Also triggers on mentions of "focusconsulting", "project #8", "the board", "backlog", "epics", "sub-tasks", "file an issue", "open a bug", "track this work", or issue/project management for this repository.
---

# Formspec GitHub Project Board Management

Manage the Formspec project board on the focusconsulting GitHub organization. The project tracks work across three layers (Engine, Management Instance, SaaS Platform) with priority and status fields. Issues live on `focusconsulting/formspec`, not the personal fork.

## Project Location

- **Org:** focusconsulting
- **Repo:** focusconsulting/formspec
- **Project:** Formspec (#8) — `https://github.com/orgs/focusconsulting/projects/8`
- **Project node ID:** `PVT_kwDOAtpwPs4BSa-P`

Always use `--repo focusconsulting/formspec` for issue commands and `--owner focusconsulting` for project commands.

## Workflow: Creating an Epic

1. **Create the parent issue** on `focusconsulting/formspec` with a descriptive body containing scope, motivation, and a task-list checklist for sub-phases
2. **Add to project** with `gh project item-add 8 --owner focusconsulting --url ISSUE_URL --format json` — capture the returned item `id`
3. **Set fields** (Layer, Priority, Status) using `gh project item-edit` with the project node ID, item ID, and field/option IDs from the quick reference below
4. **Create sub-issues** as separate issues, then link them via the `addSubIssue` GraphQL mutation — see `references/gh-cli-reference.md` for the full mutation syntax
5. **Add sub-issues to the project** and set their fields

## Workflow: Creating and Linking a Sub-Issue

1. Create the child issue: `gh issue create --repo focusconsulting/formspec --title "..." --body "..."`
2. Get node IDs for parent and child:
   ```bash
   gh api graphql -f query='{ repository(owner: "focusconsulting", name: "formspec") {
     parent: issue(number: PARENT_NUM) { id }
     child: issue(number: CHILD_NUM) { id }
   } }'
   ```
3. Link with `addSubIssue` mutation:
   ```bash
   gh api graphql -f query='mutation {
     addSubIssue(input: { issueId: "PARENT_NODE_ID", subIssueId: "CHILD_NODE_ID" }) {
       issue { number title }
       subIssue { number title }
     }
   }'
   ```
4. Add to project and set fields

## Workflow: Updating Item Status

```bash
# List items to find the item ID
gh project item-list 8 --owner focusconsulting --format json

# Set a single-select field (Status, Layer, or Priority)
gh project item-edit --project-id PVT_kwDOAtpwPs4BSa-P \
  --id ITEM_ID --field-id FIELD_ID \
  --single-select-option-id OPTION_ID
```

## Quick Reference — Field IDs and Options

| Field | Field ID | Option | Option ID |
|-------|----------|--------|-----------|
| Status | `PVTSSF_..._9eag` | Todo | `f75ad846` |
| | | In Progress | `47fc9ee4` |
| | | Done | `98236657` |
| Layer | `PVTSSF_..._9eeI` | Engine | `970b0bb3` |
| | | Management Instance | `8f319d31` |
| | | SaaS Platform | `bf782342` |
| Priority | `PVTSSF_..._9eeM` | P0 - Critical | `aaf6695c` |
| | | P1 - High | `2262865b` |
| | | P2 - Medium | `fb54183f` |
| | | P3 - Low | `70001c11` |

Full field IDs (for copy-paste): Status `PVTSSF_lADOAtpwPs4BSa-Pzg_9eag`, Layer `PVTSSF_lADOAtpwPs4BSa-Pzg_9eeI`, Priority `PVTSSF_lADOAtpwPs4BSa-Pzg_9eeM`.

## Key Constraints

- **Sub-issues require GraphQL** — `gh issue edit` has no `--add-parent` flag; use `addSubIssue` mutation
- **Max 100 sub-issues** per parent, max 8 nesting levels
- **Always use `--repo focusconsulting/formspec`** — the `origin` fetch remote points to the personal fork; issues and the project board live on the org repo
- **Capture item IDs** from `gh project item-add --format json` output — needed for all field edits
- **Use HEREDOC for long bodies:**
  ```bash
  gh issue create --repo focusconsulting/formspec --title "Title" --body "$(cat <<'EOF'
  Body content with **markdown**.
  EOF
  )"
  ```
- **Refresh auth scope if needed:** `gh auth refresh -s project`

## Additional Resources

For complete CLI syntax, all built-in field IDs, GraphQL mutations, and git remote details:
- **`references/project-config.md`** — Full field/option ID tables, built-in fields, git remotes, repo labels
- **`references/gh-cli-reference.md`** — Complete `gh project` and `gh issue` command reference, GraphQL mutations for sub-issues and field updates
