"""§6.2 JSON adapter — identity serialization (JsonValue <-> JSON bytes).

The simplest adapter: the mapping engine's internal representation is already
JSON-compatible, so this mostly delegates to stdlib json with config-driven
pretty-printing, key sorting, and null stripping.
"""

import json
from typing import Any

from .base import Adapter, JsonValue


def _strip_nulls(value: Any) -> Any:
    """Recursively prune dict keys whose values are None (for nullHandling='omit')."""
    if isinstance(value, dict):
        return {k: _strip_nulls(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [_strip_nulls(item) for item in value]
    return value


class JsonAdapter(Adapter):
    """§6.2 JSON wire-format adapter.

    Config keys: pretty (bool), sortKeys (bool), nullHandling ('include'|'omit').
    """

    def __init__(self, config: dict | None = None):
        """Parse adapter config from the mapping document's format.config block."""
        cfg = config or {}
        self.pretty: bool = cfg.get('pretty', False)
        self.sort_keys: bool = cfg.get('sortKeys', False)
        self.null_handling: str = cfg.get('nullHandling', 'include')

    def serialize(self, value: JsonValue) -> bytes:
        """Encode JsonValue to UTF-8 JSON bytes, applying null stripping and formatting."""
        data = value
        if self.null_handling == 'omit':
            data = _strip_nulls(data)
        indent = 2 if self.pretty else None
        return json.dumps(
            data,
            indent=indent,
            sort_keys=self.sort_keys,
            ensure_ascii=False,
        ).encode('utf-8')

    def deserialize(self, data: bytes) -> JsonValue:
        """Decode JSON bytes to a JsonValue tree."""
        return json.loads(data)
