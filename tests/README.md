# Formspec Conformance Test Suite

Machine-readable test suite validating JSON documents against the Formspec
family of JSON Schemas (draft 2020-12).

## Coverage

| Schema | Test File | Tests |
|---|---|---|
| `definition.schema.json` | `test_definition_schema.py` | 139 |
| `response.schema.json` + `validationReport.schema.json` | `test_response_schema.py` | 61 |
| `mapping.schema.json` | `test_mapping_schema.py` | 91 |
| `registry.schema.json` | `test_registry_schema.py` | 72 |
| All spec examples (Layer 2) | `test_spec_examples.py` | 153 |
| **Total** | | **516** |

## Test Layers

### Layer 1: Schema Conformance (363 tests)
Hand-written positive/negative test cases. One assertion per constraint.

### Layer 2: Spec Example Extraction (153 tests)
Automatically extracts every ` ```json ` block from every `.md` spec file,
classifies it (complete document, fragment, non-schema), and validates
against the appropriate schema. If someone edits a spec example and breaks
it, CI catches it.

Classification categories:
- **Complete documents** — validated against full schema (definition, response, mapping, registry)
- **Fragments** — validated against `$defs` sub-schemas (Item, Shape, FieldRule)
- **Near-complete** — patched with missing optional fields then validated (§7 responses missing `authored`)
- **Non-schema** — checked for JSON parseability only (adapter configs, diagnostics, data samples)

## Test Categories

Layer 1 test files cover:

- **Positive validation** — minimal and full valid documents
- **Required fields** — each required property missing individually
- **Enum constraints** — valid values accepted, invalid values rejected
- **Pattern constraints** — key/name/id regex enforcement
- **Format constraints** — URI, date, date-time, uri-template
- **additionalProperties** — unknown properties rejected at every level
- **if/then conditionals** — type-discriminated Item dispatch, transform-dependent FieldRule requirements, XML rootElement, category-specific registry entry fields
- **oneOf/anyOf discrimination** — Shape rules, Instance source/data, OptionSet options/source, coerce object/string, valueMap full/flat
- **Recursive structures** — nested Item children
- **Extensions** — `x-` prefix enforcement via `propertyNames` pattern

## Prerequisites

```bash
pip install pytest jsonschema
```

## Running

```bash
# From the repository root:
python3 -m pytest tests/ -v

# Single schema:
python3 -m pytest tests/test_definition_schema.py -v

# With coverage (if pytest-cov installed):
python3 -m pytest tests/ --cov=. --cov-report=term
```

## Adding Tests

Follow the existing pattern:
1. Use `@pytest.fixture` or conftest fixtures to load schemas
2. Use `jsonschema.validate` with `Draft202012Validator` for positive tests
3. Use `pytest.raises(ValidationError)` for negative tests
4. Use `@pytest.mark.parametrize` for enum/pattern value lists
5. One test = one assertion about one schema constraint
