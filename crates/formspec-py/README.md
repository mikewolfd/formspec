# formspec-py (`formspec_rust`)

PyO3 extension that exposes the Rust Formspec stack to Python as the native module **`formspec_rust`**. The editable package metadata lives in [`pyproject.toml`](./pyproject.toml) (wheel name **`formspec-rust`**); the Rust library crate is **`formspec-py`** and compiles to **`formspec_rust`** (`Cargo.toml` `[lib] name`).

## Role in the repo

- **Python entry surface:** [`src/formspec/_rust.py`](../../src/formspec/_rust.py) is the only code that imports `formspec_rust`. It checks **`PY_API_VERSION`**, required exports, and the **`evaluate_def`** parameter list before re-exporting typed helpers to the rest of `src/formspec`.
- **Rust stack:** Depends on [`fel-core`](../fel-core), [`formspec-core`](../formspec-core), [`formspec-eval`](../formspec-eval), and [`formspec-lint`](../formspec-lint).

If you add or rename a `#[pyfunction]` registered in `src/lib.rs`, update `_rust.py` (and its contract tests) in the same change.

## Exported surface (summary)

| Area | Python symbols (examples) |
|------|---------------------------|
| FEL | `eval_fel`, `eval_fel_detailed`, `parse_fel`, `get_dependencies`, `extract_deps`, `analyze_expression`, `list_builtin_functions` |
| Documents | `detect_type`, `lint_document`, `evaluate_def`, `evaluate_screener_py` |
| Registry | `parse_registry`, `find_registry_entry`, `validate_lifecycle`, `well_known_url` |
| Changelog | `generate_changelog` |
| Mapping | `execute_mapping_doc` |

Module constants: **`PY_API_VERSION`** (must stay in sync with `EXPECTED_PY_API_VERSION` in `_rust.py`) and **`CRATE_VERSION`**.

## Build / install (Python)

From the repo root (typical local dev):

```bash
python3 -m pip install --no-build-isolation ./crates/formspec-py
```

[`pyproject.toml`](./pyproject.toml) enables Maturin’s **`extension-module`** feature so release wheels do not link `libpython`.

## Rust development

```bash
# From repository root
cargo test -p formspec-py
cargo clippy -p formspec-py --all-targets
```

- **Layout:** `src/lib.rs` only wires `#[pymodule]`; logic lives in `convert`, `fel`, `document`, `registry`, `changelog`, `mapping`.
- **Tests:** Mapping parsers and string helpers are covered by `native_tests` (80+ unit tests).

## Source layout

```
src/
  lib.rs           # pymodule registration only
  convert.rs       # Python ↔ FEL / JSON, depythonize, parse_fel_expr, registry/changelog strings
  fel.rs           # FEL eval, deps, analysis, builtins
  document.rs      # lint, evaluate_def, screener, detect_type
  registry.rs      # registry client bindings
  changelog.rs     # generate_changelog
  mapping.rs       # mapping doc execution
  native_tests.rs  # #[cfg(test)] only
```

For crate-level API details, run `cargo doc -p formspec-py --open` from the workspace root.
