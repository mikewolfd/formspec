"""Shared fixtures for Formspec conformance test suite."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"


def _load_schema(name: str) -> dict:
    path = SCHEMA_DIR / name
    with open(path) as f:
        return json.load(f)


def build_schema_registry(*schemas: dict) -> Registry:
    """Build a Draft 2020-12 registry for one or more schema documents."""
    resources = []
    for schema in schemas:
        schema_id = schema.get("$id")
        if not schema_id:
            raise ValueError("Schema must include an '$id' field")
        resources.append(
            (
                schema_id,
                Resource.from_contents(schema, default_specification=DRAFT202012),
            )
        )
    return Registry().with_resources(resources)


@pytest.fixture(scope="session")
def definition_schema():
    return _load_schema("definition.schema.json")


@pytest.fixture(scope="session")
def response_schema():
    return _load_schema("response.schema.json")


@pytest.fixture(scope="session")
def validation_report_schema():
    return _load_schema("validationReport.schema.json")


@pytest.fixture(scope="session")
def mapping_schema():
    return _load_schema("mapping.schema.json")


@pytest.fixture(scope="session")
def registry_schema():
    return _load_schema("registry.schema.json")


@pytest.fixture(scope="session")
def theme_schema():
    return _load_schema("theme.schema.json")


@pytest.fixture(scope="session")
def component_schema():
    return _load_schema("component.schema.json")


@pytest.fixture(scope="session")
def changelog_schema():
    return _load_schema("changelog.schema.json")


@pytest.fixture(scope="session")
def schema_registry(
    definition_schema,
    response_schema,
    validation_report_schema,
    mapping_schema,
    registry_schema,
    theme_schema,
    component_schema,
    changelog_schema,
):
    return build_schema_registry(
        definition_schema,
        response_schema,
        validation_report_schema,
        mapping_schema,
        registry_schema,
        theme_schema,
        component_schema,
        changelog_schema,
    )
