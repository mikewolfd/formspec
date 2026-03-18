#!/usr/bin/env python3
"""Validate all grant-report JSON artifacts using the formspec validation helper."""
import sys
from pathlib import Path

from formspec.validate import discover_artifacts, validate_all, print_report

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

artifacts = discover_artifacts(
    HERE,
    registry_paths=(ROOT / "registries" / "formspec-common.registry.json",),
)
sys.exit(print_report(validate_all(artifacts), title="Grant Report"))
