/** @filedesc UI presentation constants for FEL function catalog display (data sourced from Rust/WASM). */
import { getBuiltinFELFunctionCatalog } from 'formspec-engine';

export interface FELFunction {
  name: string;
  signature: string;
  description: string;
  category: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Aggregate: 'text-accent',
  String: 'text-green',
  Numeric: 'text-amber',
  Date: 'text-logic',
  Logical: 'text-accent',
  Type: 'text-muted',
  Money: 'text-green',
  Repeat: 'text-amber',
  MIP: 'text-logic',
  Instance: 'text-muted',
  Locale: 'text-muted',
  Function: 'text-muted',
};

export const CATEGORY_ORDER = [
  'Aggregate', 'String', 'Numeric', 'Date', 'Logical', 'Type',
  'Money', 'Repeat', 'MIP', 'Instance', 'Locale', 'Function',
];

export function formatCategoryName(category: string): string {
  if (category === 'mip') return 'MIP';
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Function';
}

/** Returns the FEL function catalog from the Rust/WASM engine with UI-friendly category names. */
export function getFELCatalog(): FELFunction[] {
  return getBuiltinFELFunctionCatalog().map(entry => ({
    name: entry.name,
    signature: entry.signature ?? '',
    description: entry.description ?? '',
    category: formatCategoryName(entry.category),
  }));
}
