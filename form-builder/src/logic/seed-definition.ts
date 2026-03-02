import type { FormspecDefinition } from 'formspec-engine';

export function createEmptyDefinition(): FormspecDefinition {
  return {
    $formspec: '1.0',
    url: 'https://example.gov/forms/untitled',
    version: '0.1.0',
    status: 'draft',
    title: 'Untitled Form',
    items: [
      {
        key: 'basicInfo',
        type: 'group',
        label: 'Basic Information',
        children: [
          { key: 'fullName', type: 'field', label: 'Full Name', dataType: 'string' },
          { key: 'email', type: 'field', label: 'Email Address', dataType: 'string' },
        ],
      },
      { key: 'notes', type: 'field', label: 'Additional Notes', dataType: 'text' },
    ],
  } as FormspecDefinition;
}
