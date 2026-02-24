"""Formspec Mapping DSL — Execution Engine (§3-5).

Transforms data between Formspec Response format and external schemas
using declarative field rules with 10 transform types.

Public API:
    MappingEngine(mapping_document) — bidirectional transform engine
"""

from .engine import MappingEngine

__all__ = ['MappingEngine']
