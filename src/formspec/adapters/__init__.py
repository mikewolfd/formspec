"""Formspec Mapping DSL — Format Adapters (§6).

Provides serialization/deserialization for JSON, XML, and CSV formats.

Public API:
    get_adapter(format, config, target_schema) → Adapter
    register_adapter(prefix, adapter_class) — register custom x- adapter
    JsonAdapter, XmlAdapter, CsvAdapter
"""

from .base import Adapter, JsonValue
from .json_adapter import JsonAdapter
from .xml_adapter import XmlAdapter
from .csv_adapter import CsvAdapter

# Custom adapter registry for x- prefixed formats (§6.5)
_custom_adapters: dict[str, type] = {}


def register_adapter(prefix: str, adapter_class: type) -> None:
    """Register a custom adapter class for an x- prefixed format.

    Args:
        prefix: Format identifier (must start with 'x-').
        adapter_class: Class that extends Adapter.

    Raises:
        ValueError: If prefix doesn't start with 'x-'.
    """
    if not prefix.startswith('x-'):
        raise ValueError(f"Custom adapter prefix must start with 'x-', got '{prefix}'")
    _custom_adapters[prefix] = adapter_class


def get_adapter(
    format: str,
    config: dict | None = None,
    target_schema: dict | None = None,
) -> Adapter:
    """Factory: create an adapter for the given format.

    Args:
        format: 'json', 'xml', 'csv', or 'x-*' custom identifier.
        config: Adapter-specific configuration dict.
        target_schema: The targetSchema object from the mapping document.

    Returns:
        An Adapter instance.

    Raises:
        ValueError: If the format is unrecognized.
    """
    ts = target_schema or {}

    if format == 'json':
        return JsonAdapter(config)
    elif format == 'xml':
        return XmlAdapter(
            config=config,
            root_element=ts.get('rootElement', 'root'),
            namespaces=ts.get('namespaces'),
        )
    elif format == 'csv':
        return CsvAdapter(config)
    elif format.startswith('x-'):
        if format in _custom_adapters:
            return _custom_adapters[format](config)
        raise ValueError(
            f"Custom adapter '{format}' is not registered. "
            f"Use register_adapter('{format}', YourAdapterClass) first."
        )
    else:
        raise ValueError(
            f"Unrecognized adapter format: '{format}'. "
            f"Must be 'json', 'xml', 'csv', or 'x-*' prefix."
        )
