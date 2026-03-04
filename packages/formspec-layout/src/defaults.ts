/**
 * Map a definition item to its default component type based on `dataType`.
 *
 * Used as a fallback when no component document is provided or when the
 * theme's widget cascade doesn't resolve to an available component.
 *
 * @param item - A definition item with a `dataType` property.
 * @returns The default component type string (e.g. "TextInput", "NumberInput").
 */
export function getDefaultComponent(item: { dataType?: string }): string {
    switch (item.dataType) {
        case 'string': return 'TextInput';
        case 'text': return 'TextInput';
        case 'integer':
        case 'decimal':
        case 'number': return 'NumberInput';
        case 'boolean': return 'Toggle';
        case 'date': return 'DatePicker';
        case 'dateTime': return 'DatePicker';
        case 'time': return 'DatePicker';
        case 'uri': return 'TextInput';
        case 'choice': return 'Select';
        case 'multiChoice': return 'CheckboxGroup';
        case 'attachment': return 'FileUpload';
        case 'money': return 'NumberInput';
        default: return 'TextInput';
    }
}
