"""Formspec Changelog generation — diff two definition versions.

Compares two Formspec Definition documents and produces a Changelog document
conforming to changelog.schema.json. Classifies changes by target category
and impact severity.

Public API:
    generate_changelog(old_def, new_def, definition_url) -> dict
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


# Target categories from the schema
_TARGETS = {
    'items': 'item',
    'binds': 'bind',
    'shapes': 'shape',
    'optionSets': 'optionSet',
    'dataSources': 'dataSource',
    'screener': 'screener',
    'migrations': 'migration',
}

# Top-level keys that map to 'metadata' target
_METADATA_KEYS = {'title', 'url', 'version', '$formspec', 'description', 'formPresentation'}


def generate_changelog(
    old_def: dict,
    new_def: dict,
    definition_url: str,
) -> dict:
    """Generate a changelog document comparing two definition versions.

    Args:
        old_def: The older definition document.
        new_def: The newer definition document.
        definition_url: Canonical URL of the definition.

    Returns:
        A changelog document conforming to changelog.schema.json.
    """
    changes: list[dict] = []

    # Diff items
    _diff_keyed_list(
        old_def.get('items', []),
        new_def.get('items', []),
        'item',
        'items',
        changes,
    )

    # Diff binds
    _diff_keyed_list(
        old_def.get('binds', []),
        new_def.get('binds', []),
        'bind',
        'binds',
        changes,
        key_field='path',
    )

    # Diff shapes
    _diff_keyed_list(
        old_def.get('shapes', []),
        new_def.get('shapes', []),
        'shape',
        'shapes',
        changes,
        key_field='name',
    )

    # Diff optionSets (keyed by name)
    _diff_dict_section(old_def.get('optionSets', {}), new_def.get('optionSets', {}), 'optionSet', 'optionSets', changes)

    # Diff dataSources (keyed by name)
    _diff_dict_section(old_def.get('dataSources', {}), new_def.get('dataSources', {}), 'dataSource', 'dataSources', changes)

    # Diff screener
    old_screener = old_def.get('screener')
    new_screener = new_def.get('screener')
    if old_screener != new_screener:
        if old_screener is None and new_screener is not None:
            changes.append(_change('added', 'screener', 'screener', 'compatible', after=new_screener))
        elif old_screener is not None and new_screener is None:
            changes.append(_change('removed', 'screener', 'screener', 'breaking', before=old_screener))
        elif old_screener != new_screener:
            changes.append(_change('modified', 'screener', 'screener', 'compatible', before=old_screener, after=new_screener))

    # Diff migrations
    old_migrations = old_def.get('migrations', [])
    new_migrations = new_def.get('migrations', [])
    if old_migrations != new_migrations:
        if not old_migrations and new_migrations:
            changes.append(_change('added', 'migration', 'migrations', 'compatible', after=new_migrations))
        elif old_migrations and not new_migrations:
            changes.append(_change('removed', 'migration', 'migrations', 'compatible', before=old_migrations))
        else:
            changes.append(_change('modified', 'migration', 'migrations', 'cosmetic', before=old_migrations, after=new_migrations))

    # Diff metadata keys
    for key in _METADATA_KEYS:
        old_val = old_def.get(key)
        new_val = new_def.get(key)
        if old_val != new_val:
            if old_val is None:
                changes.append(_change('added', 'metadata', key, 'cosmetic', after=new_val))
            elif new_val is None:
                changes.append(_change('removed', 'metadata', key, 'cosmetic', before=old_val))
            else:
                changes.append(_change('modified', 'metadata', key, 'cosmetic', before=old_val, after=new_val))

    # Determine semver impact
    semver_impact = _compute_semver_impact(changes)

    return {
        'definitionUrl': definition_url,
        'fromVersion': old_def.get('version', '0.0.0'),
        'toVersion': new_def.get('version', '0.0.0'),
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'semverImpact': semver_impact,
        'changes': changes,
    }


def _diff_keyed_list(
    old_items: list[dict],
    new_items: list[dict],
    target: str,
    prefix: str,
    changes: list[dict],
    key_field: str = 'key',
) -> None:
    """Diff two lists of objects keyed by a field name."""
    old_map = {item.get(key_field): item for item in old_items if item.get(key_field)}
    new_map = {item.get(key_field): item for item in new_items if item.get(key_field)}

    old_keys = set(old_map.keys())
    new_keys = set(new_map.keys())

    # Added items
    for key in sorted(new_keys - old_keys):
        impact = _classify_item_add(new_map[key], target)
        changes.append(_change(
            'added', target, f"{prefix}.{key}",
            impact, key=key, after=new_map[key],
        ))

    # Removed items
    for key in sorted(old_keys - new_keys):
        impact = _classify_item_remove(old_map[key], target)
        changes.append(_change(
            'removed', target, f"{prefix}.{key}",
            impact, key=key, before=old_map[key],
        ))

    # Modified items
    for key in sorted(old_keys & new_keys):
        if old_map[key] != new_map[key]:
            impact = _classify_item_modify(old_map[key], new_map[key], target)
            changes.append(_change(
                'modified', target, f"{prefix}.{key}",
                impact, key=key, before=old_map[key], after=new_map[key],
            ))


def _diff_dict_section(
    old_dict: dict,
    new_dict: dict,
    target: str,
    prefix: str,
    changes: list[dict],
) -> None:
    """Diff two dict-keyed sections (optionSets, dataSources)."""
    old_keys = set(old_dict.keys())
    new_keys = set(new_dict.keys())

    for key in sorted(new_keys - old_keys):
        changes.append(_change('added', target, f"{prefix}.{key}", 'compatible', after=new_dict[key]))
    for key in sorted(old_keys - new_keys):
        changes.append(_change('removed', target, f"{prefix}.{key}", 'breaking', before=old_dict[key]))
    for key in sorted(old_keys & new_keys):
        if old_dict[key] != new_dict[key]:
            changes.append(_change('modified', target, f"{prefix}.{key}", 'compatible', before=old_dict[key], after=new_dict[key]))


def _change(
    type_: str,
    target: str,
    path: str,
    impact: str,
    *,
    key: str | None = None,
    before: Any = None,
    after: Any = None,
    description: str | None = None,
    migration_hint: str | None = None,
) -> dict:
    """Build a Change object."""
    c: dict = {
        'type': type_,
        'target': target,
        'path': path,
        'impact': impact,
    }
    if key is not None:
        c['key'] = key
    if before is not None:
        c['before'] = before
    if after is not None:
        c['after'] = after
    if description is not None:
        c['description'] = description
    if migration_hint is not None:
        c['migrationHint'] = migration_hint
    return c


def _classify_item_add(item: dict, target: str) -> str:
    """Classify the impact of adding an item/bind/shape."""
    if target == 'item':
        # Adding an optional field is compatible, adding required is breaking
        # (because existing responses won't have it)
        return 'compatible'
    if target == 'bind':
        # Adding a bind with required=true is breaking
        if item.get('required'):
            return 'breaking'
        return 'compatible'
    if target == 'shape':
        # Adding a shape adds validation — could break existing responses
        return 'compatible'
    return 'compatible'


def _classify_item_remove(item: dict, target: str) -> str:
    """Classify the impact of removing an item/bind/shape."""
    if target == 'item':
        return 'breaking'
    if target == 'bind':
        return 'breaking'
    if target == 'shape':
        return 'compatible'  # Removing validation loosens constraints
    return 'breaking'


def _classify_item_modify(old: dict, new: dict, target: str) -> str:
    """Classify the impact of modifying an item/bind/shape."""
    if target == 'item':
        # Type change is breaking
        if old.get('dataType') != new.get('dataType'):
            return 'breaking'
        if old.get('type') != new.get('type'):
            return 'breaking'
        # Label-only change is cosmetic
        non_cosmetic_keys = {'key', 'type', 'dataType', 'initialValue', 'items'}
        old_significant = {k: v for k, v in old.items() if k in non_cosmetic_keys}
        new_significant = {k: v for k, v in new.items() if k in non_cosmetic_keys}
        if old_significant == new_significant:
            return 'cosmetic'
        return 'compatible'
    if target == 'bind':
        # Adding required where it wasn't is breaking
        if not old.get('required') and new.get('required'):
            return 'breaking'
        # Removing required is compatible
        if old.get('required') and not new.get('required'):
            return 'compatible'
        # Changing constraint expression could break existing data
        if old.get('constraint') != new.get('constraint'):
            return 'compatible'
        return 'cosmetic'
    return 'compatible'


def _compute_semver_impact(changes: list[dict]) -> str:
    """Determine overall semver impact from individual change impacts."""
    if any(c['impact'] == 'breaking' for c in changes):
        return 'major'
    if any(c['impact'] == 'compatible' for c in changes):
        return 'minor'
    if changes:
        return 'patch'
    return 'patch'  # No changes = patch (identity)
