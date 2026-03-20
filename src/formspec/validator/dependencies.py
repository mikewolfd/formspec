"""Pass 5: Build a bind-target dependency graph from compiled expressions and detect cycles (E500).

Uses the FEL static dependency extractor to find field references in each bind's dataflow
expressions, then runs DFS cycle detection with rotation-based deduplication.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from formspec.fel import extract_dependencies

from .diagnostic import LintDiagnostic
from .expressions import CompiledExpression


@dataclass(slots=True)
class DependencyAnalysisResult:
    """Bind-target dependency graph (target -> set of referenced fields) plus E500 cycle diagnostics."""

    graph: dict[str, set[str]] = field(default_factory=dict)
    diagnostics: list[LintDiagnostic] = field(default_factory=list)


def analyze_dependencies(compiled_expressions: list[CompiledExpression]) -> DependencyAnalysisResult:
    """Entry point: build dependency graph from compiled dataflow expressions, then detect cycles (E500)."""
    result = DependencyAnalysisResult()
    bind_path_lookup: dict[str, str] = {}

    for compiled in compiled_expressions:
        if not compiled.bind_target:
            continue

        deps = extract_dependencies(compiled.expression)
        node = compiled.bind_target
        result.graph.setdefault(node, set()).update(deps.fields)
        if compiled.bind_path_pointer and node not in bind_path_lookup:
            bind_path_lookup[node] = compiled.bind_path_pointer

    cycles = _find_cycles(result.graph)
    for cycle in cycles:
        first = cycle[0]
        result.diagnostics.append(
            LintDiagnostic(
                severity="error",
                code="E500",
                message=f"Dependency cycle detected: {' -> '.join(cycle)}",
                path=bind_path_lookup.get(first, "$.binds"),
                category="dependency",
            )
        )

    return result


def _find_cycles(graph: dict[str, set[str]]) -> list[list[str]]:
    """DFS-based cycle detection returning deduplicated cycle paths (rotation-normalized)."""
    visited: set[str] = set()
    in_stack: set[str] = set()
    stack: list[str] = []
    cycles: list[list[str]] = []
    seen_cycles: set[tuple[str, ...]] = set()

    def dfs(node: str) -> None:
        if node in in_stack:
            cycle_start = stack.index(node)
            cycle = stack[cycle_start:] + [node]
            signature = _canonical_cycle_signature(cycle)
            if signature not in seen_cycles:
                seen_cycles.add(signature)
                cycles.append(cycle)
            return

        if node in visited:
            return

        visited.add(node)
        in_stack.add(node)
        stack.append(node)

        for dep in sorted(graph.get(node, set())):
            if dep not in graph:
                continue
            dfs(dep)

        stack.pop()
        in_stack.remove(node)

    for node in sorted(graph):
        dfs(node)

    return cycles


def _canonical_cycle_signature(cycle: list[str]) -> tuple[str, ...]:
    """Rotate cycle to lexicographic minimum so A->B->A and B->A->B are the same signature."""
    nodes = cycle[:-1]
    if not nodes:
        return tuple(cycle)

    rotations = [tuple(nodes[i:] + nodes[:i]) for i in range(len(nodes))]
    normalized = min(rotations)
    return normalized
