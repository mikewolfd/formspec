"""§6.1 Adapter ABC — decouples the mapping engine from wire formats.

Subclasses implement serialize/deserialize for a single target format
(JSON, XML, CSV, or custom x-prefixed formats).
"""

from abc import ABC, abstractmethod
from typing import Any

#: Plain Python JSON-compatible value tree (the mapping engine's internal currency).
JsonValue = Any  # dict | list | str | int | float | bool | None


class Adapter(ABC):
    """Abstract bidirectional serializer between JsonValue trees and wire-format bytes."""

    @abstractmethod
    def serialize(self, value: JsonValue) -> bytes:
        """Encode a JsonValue tree to wire-format bytes for the target system."""
        ...

    @abstractmethod
    def deserialize(self, data: bytes) -> JsonValue:
        """Decode wire-format bytes back into a JsonValue tree."""
        ...
