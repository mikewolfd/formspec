import type { AddPickerEntry } from '../types';

export interface RegistryEntry {
    name: string;
    category: 'dataType' | 'constraint' | 'function' | 'namespace';
    version: string;
    description: string;
    baseType?: string;
    metadata?: Record<string, any>;
    examples?: any[];
}

export interface Registry {
    $formspecRegistry: string;
    publisher: { name: string; url: string };
    entries: RegistryEntry[];
}

const DATA_TYPE_COMPONENT: Record<string, string> = {
    string: 'TextInput',
    text: 'TextInput',
    integer: 'NumberInput',
    decimal: 'NumberInput',
    number: 'NumberInput',
    boolean: 'Toggle',
    date: 'DatePicker',
    dateTime: 'DatePicker',
    time: 'DatePicker',
    uri: 'TextInput',
    attachment: 'FileUpload',
    choice: 'Select',
    multiChoice: 'CheckboxGroup',
    money: 'MoneyInput',
};

export async function loadRegistry(url: string): Promise<Registry> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load registry from ${url}`);
    }
    return response.json();
}

/**
 * Converts registry entries into AddPickerEntry items.
 * Specifically handles 'dataType' entries that have examples.
 */
export function registryToPickerEntries(registry: Registry): AddPickerEntry[] {
    return registry.entries
        .filter(entry => entry.category === 'dataType' && entry.examples && entry.examples.length > 0)
        .map(entry => {
            const baseType = entry.baseType || 'string';
            const component = DATA_TYPE_COMPONENT[baseType] || 'TextInput';

            return {
                component,
                label: entry.metadata?.displayName || entry.name,
                category: 'input',
                defaultDataType: baseType,
                createsDefinitionItem: true,
                definitionType: 'field',
                promptForLabel: true,
                // Custom flag to handle extension and other metadata
                registryEntry: entry
            } as any;
        });
}
