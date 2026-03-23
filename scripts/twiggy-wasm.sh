#!/usr/bin/env bash
# Run twiggy on shipped runtime/tools WASM (post wasm-opt). Supplements `cargo bloat` proxy bins:
# twiggy sees the real .wasm; cargo bloat sees host .text by crate name.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_WASM="$ROOT/packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm"
TOOLS_WASM="$ROOT/packages/formspec-engine/wasm-pkg-tools/formspec_wasm_tools_bg.wasm"
TOP_N="${TOP_N:-25}"
DIFF_N="${DIFF_N:-35}"

if ! command -v twiggy >/dev/null 2>&1; then
  echo "twiggy not on PATH. Install: cargo install twiggy" >&2
  exit 1
fi

need_wasm() {
  if [[ ! -f "$RUNTIME_WASM" || ! -f "$TOOLS_WASM" ]]; then
    echo "Missing WASM artifacts. Build with:" >&2
    echo "  cd packages/formspec-engine && npm run build:wasm" >&2
    exit 1
  fi
}

case "${1:-all}" in
  --help|-h)
    echo "Usage: $0 [all|top|retained|diff|monos|garbage]"
    echo "  all       — top + retained + diff + monos + garbage (default)"
    echo "  top       — twiggy top (shallow) for runtime and tools"
    echo "  retained  — twiggy top --retained"
    echo "  diff      — twiggy diff runtime → tools (what the tools build adds)"
    echo "  monos     — twiggy monos (generic bloat; often empty)"
    echo "  garbage   — twiggy garbage (mostly false positives on data segments)"
    echo "Env: TOP_N (default 25), DIFF_N (default 35)"
    exit 0
    ;;
esac

need_wasm

run_top() {
  echo "======== twiggy top (shallow) — RUNTIME ($TOP_N) ========"
  twiggy top "$RUNTIME_WASM" -n "$TOP_N"
  echo ""
  echo "======== twiggy top (shallow) — TOOLS ($TOP_N) ========"
  twiggy top "$TOOLS_WASM" -n "$TOP_N"
}

run_retained() {
  echo "======== twiggy top --retained — RUNTIME ($TOP_N) ========"
  twiggy top "$RUNTIME_WASM" -n "$TOP_N" --retained
  echo ""
  echo "======== twiggy top --retained — TOOLS ($TOP_N) ========"
  twiggy top "$TOOLS_WASM" -n "$TOP_N" --retained
}

run_diff() {
  echo "======== twiggy diff: RUNTIME (old) → TOOLS (new) ($DIFF_N rows) ========"
  echo "Positive delta = larger in tools; negative = smaller than runtime slot (indices shift between builds)."
  twiggy diff "$RUNTIME_WASM" "$TOOLS_WASM" -n "$DIFF_N"
}

run_monos() {
  echo "======== twiggy monos — RUNTIME ========"
  twiggy monos "$RUNTIME_WASM" -n 25
  echo ""
  echo "======== twiggy monos — TOOLS ========"
  twiggy monos "$TOOLS_WASM" -n 25
}

run_garbage() {
  echo "======== twiggy garbage — RUNTIME (sample) ========"
  twiggy garbage "$RUNTIME_WASM" -n 10
  echo ""
  echo "======== twiggy garbage — TOOLS (sample) ========"
  twiggy garbage "$TOOLS_WASM" -n 10
}

case "${1:-all}" in
  top) run_top ;;
  retained) run_retained ;;
  diff) run_diff ;;
  monos) run_monos ;;
  garbage) run_garbage ;;
  all)
    run_top
    echo ""
    run_retained
    echo ""
    run_diff
    echo ""
    run_monos
    echo ""
    run_garbage
    ;;
  *)
    echo "Unknown subcommand: $1" >&2
    echo "Run $0 --help" >&2
    exit 1
    ;;
esac
