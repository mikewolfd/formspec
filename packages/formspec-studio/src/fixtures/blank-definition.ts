/** @filedesc Minimal valid Studio seed used for first-run blank onboarding projects. */
import type { FormDefinition } from '@formspec-org/studio-core';

export const BLANK_URL_PLACEHOLDER = 'formspec://studio/untitled-form';

export function slugifyForUrl(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'untitled';
}

export function mintUrlFromName(name: string): string {
  return `formspec://studio/${slugifyForUrl(name)}`;
}

export const blankDefinition: FormDefinition = {
  $formspec: '1.0',
  name: 'untitled-form',
  url: BLANK_URL_PLACEHOLDER,
  version: '0.0.1',
  title: 'Untitled form',
  status: 'draft',
  formPresentation: {
    pageMode: 'single',
    labelPosition: 'top',
    density: 'comfortable',
  },
  items: [],
};
