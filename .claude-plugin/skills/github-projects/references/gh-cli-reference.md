# GitHub Projects — CLI and GraphQL Reference

## gh CLI — Project Commands

All project commands use `--owner Formspec-org` and project number `8`.

### Listing and Viewing

```bash
# List all projects in the org
gh project list --owner Formspec-org --format json

# View project details
gh project view 8 --owner Formspec-org

# List project fields and their IDs/options
gh project field-list 8 --owner Formspec-org --format json

# List all items in the project
gh project item-list 8 --owner Formspec-org --format json
```

### Adding Items

```bash
# Add an existing issue to the project (returns item ID)
gh project item-add 8 --owner Formspec-org \
  --url https://github.com/Formspec-org/formspec/issues/NUMBER \
  --format json

# Create a draft item directly in the project
gh project item-create 8 --owner Formspec-org \
  --title "Draft item title" --body "Description"
```

### Editing Item Fields

All field edits use `gh project item-edit` with:
- `--project-id` — the project node ID (not number)
- `--id` — the item node ID (from item-add or item-list)
- `--field-id` — the field node ID
- `--single-select-option-id` — for single-select fields

```bash
# Set a single-select field (Status, Layer, Priority)
gh project item-edit \
  --project-id PVT_kwDOAtpwPs4BSa-P \
  --id ITEM_NODE_ID \
  --field-id FIELD_ID \
  --single-select-option-id OPTION_ID

# Set a text field
gh project item-edit \
  --project-id PVT_kwDOAtpwPs4BSa-P \
  --id ITEM_NODE_ID \
  --field-id FIELD_ID \
  --text "value"

# Set a number field
gh project item-edit \
  --project-id PVT_kwDOAtpwPs4BSa-P \
  --id ITEM_NODE_ID \
  --field-id FIELD_ID \
  --number 42

# Set a date field
gh project item-edit \
  --project-id PVT_kwDOAtpwPs4BSa-P \
  --id ITEM_NODE_ID \
  --field-id FIELD_ID \
  --date "2026-04-01"
```

### Other Project Commands

```bash
# Archive an item
gh project item-archive 8 --owner Formspec-org --id ITEM_NODE_ID

# Delete an item from the project
gh project item-delete 8 --owner Formspec-org --id ITEM_NODE_ID

# Create a new custom field
gh project field-create 8 --owner Formspec-org \
  --name "Sprint" --data-type "SINGLE_SELECT"

# Delete a custom field
gh project field-delete --id FIELD_ID

# Link a repo to the project
gh project link 8 --owner Formspec-org --repo Formspec-org/formspec

# Close/reopen project
gh project close 8 --owner Formspec-org
```

## gh CLI — Issue Commands

Always use `--repo Formspec-org/formspec` for issue operations.

```bash
# Create an issue
gh issue create --repo Formspec-org/formspec \
  --title "Issue title" \
  --body "Issue body with markdown"

# List issues
gh issue list --repo Formspec-org/formspec --json number,title,state

# View an issue
gh issue view NUMBER --repo Formspec-org/formspec

# Edit an issue
gh issue edit NUMBER --repo Formspec-org/formspec \
  --title "New title" --add-label "enhancement"

# Comment on an issue
gh issue comment NUMBER --repo Formspec-org/formspec \
  --body "Comment text"

# Close/reopen
gh issue close NUMBER --repo Formspec-org/formspec
gh issue reopen NUMBER --repo Formspec-org/formspec
```

## GraphQL API — Sub-Issues

The `gh` CLI does not support `--add-parent` or `--add-child` flags for issues. Sub-issue management requires GraphQL.

### Get Issue Node IDs

```bash
gh api graphql -f query='
{
  repository(owner: "Formspec-org", name: "formspec") {
    parent: issue(number: PARENT_NUMBER) { id }
    child: issue(number: CHILD_NUMBER) { id }
  }
}'
```

### Add Sub-Issue

```bash
gh api graphql -f query='
mutation {
  addSubIssue(input: {
    issueId: "PARENT_NODE_ID",
    subIssueId: "CHILD_NODE_ID"
  }) {
    issue { number title }
    subIssue { number title }
  }
}'
```

### Remove Sub-Issue

```bash
gh api graphql -f query='
mutation {
  removeSubIssue(input: {
    issueId: "PARENT_NODE_ID",
    subIssueId: "CHILD_NODE_ID"
  }) {
    issue { number title }
    subIssue { number title }
  }
}'
```

### List Sub-Issues of a Parent

```bash
gh api graphql -f query='
{
  repository(owner: "Formspec-org", name: "formspec") {
    issue(number: PARENT_NUMBER) {
      title
      subIssues(first: 50) {
        nodes {
          number
          title
          state
        }
      }
    }
  }
}'
```

## GraphQL API — Project Field Updates

For advanced field operations not covered by `gh project item-edit`:

```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDOAtpwPs4BSa-P"
    itemId: "ITEM_NODE_ID"
    fieldId: "FIELD_ID"
    value: { singleSelectOptionId: "OPTION_ID" }
  }) {
    projectV2Item { id }
  }
}'
```

Value types by field:
- **Text:** `value: { text: "string" }`
- **Number:** `value: { number: 42 }`
- **Date:** `value: { date: "2026-04-01" }`
- **Single select:** `value: { singleSelectOptionId: "ID" }`
- **Iteration:** `value: { iterationId: "ID" }`

## Constraints

- Sub-issues: max 100 per parent, max 8 nesting levels
- Project fields: max 50 total (built-in + custom)
- GraphQL requires `project` scope on the token (`gh auth status` to verify)
