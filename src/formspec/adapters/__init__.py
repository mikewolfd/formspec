"""§6 Format adapters — factory + registry for JSON, XML, CSV, and custom x-prefixed formats."""

from .base import Adapter, JsonValue
from .json_adapter import JsonAdapter
from .xml_adapter import XmlAdapter
from .csv_adapter import CsvAdapter

# Custom adapter registry for x- prefixed formats (§6.5)
_custom_adapters: dict[str, type] = {}


def register_adapter(prefix: str, adapter_class: type) -> None:
    """Register a custom Adapter subclass for an x-prefixed format identifier (§6.5)."""
    if not prefix.startswith('x-'):
        raise ValueError(f"Custom adapter prefix must start with 'x-', got '{prefix}'")
    _custom_adapters[prefix] = adapter_class


def get_adapter(
    format: str,
    config: dict | None = None,
    target_schema: dict | None = None,
) -> Adapter:
    """Factory: instantiate the Adapter for *format* ('json'|'xml'|'csv'|'x-*')."""
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
