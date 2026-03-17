/** @filedesc Client-side adapters for serializing mapped data to XML, CSV, and JSON for the preview. */

export interface AdapterOptions {
  format?: 'json' | 'xml' | 'csv';
  rootElement?: string;
  namespaces?: Record<string, string>;
  delimiter?: string;
  header?: boolean;
}

/**
 * Serializes a plain object to its target format based on the provided schema/options.
 */
export function serializeMappedData(data: any, options: AdapterOptions = {}): string {
  const format = options.format || 'json';

  try {
    switch (format) {
      case 'xml':
        return toXML(data, options);
      case 'csv':
        return toCSV(data, options);
      case 'json':
      default:
        return JSON.stringify(data, null, 2);
    }
  } catch (err: any) {
    return `Serialization Error: ${err.message}`;
  }
}

function toXML(data: any, options: AdapterOptions): string {
  const root = options.rootElement || 'root';
  const namespaces = options.namespaces || {};
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  
  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => ` xmlns${prefix ? `:${prefix}` : ''}="${uri}"`)
    .join('');
    
  xml += `<${root}${nsAttrs}>\n`;
  xml += serializeNode(data, 1);
  xml += `</${root}>`;
  
  return xml;
}

function serializeNode(data: any, depth: number): string {
  if (data === null || data === undefined) return '';
  const indent = '  '.repeat(depth);
  let xml = '';

  if (typeof data !== 'object') {
    return String(data);
  }

  if (Array.isArray(data)) {
    // Array handling depends on how the data was mapped. 
    // Usually in Formspec, arrays are items in a parent.
    return data.map(item => serializeNode(item, depth)).join('\n');
  }

  // Handle attributes first (@ prefix)
  const attrs = Object.entries(data)
    .filter(([key]) => key.startsWith('@'))
    .map(([key, val]) => ` ${key.slice(1)}="${val}"`)
    .join('');
    
  // Handle children
  const children = Object.entries(data)
    .filter(([key]) => !key.startsWith('@'))
    .map(([key, val]) => {
      const open = `<${key}${attrs}>`;
      const close = `</${key}>`;
      if (typeof val === 'object' && val !== null) {
        return `${indent}<${key}>\n${serializeNode(val, depth + 1)}\n${indent}</${key}>`;
      }
      return `${indent}<${key}>${val}</${key}>`;
    })
    .join('\n');

  return children;
}

function toCSV(data: any, options: AdapterOptions): string {
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) {
      data = [data]; // Wrap single object
    } else {
      return '';
    }
  }

  if (data.length === 0) return '';

  const delimiter = options.delimiter || ',';
  const headers = Object.keys(data[0]);
  const rows = [headers.join(delimiter)];

  for (const item of data) {
    const values = headers.map(h => {
      const val = item[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(delimiter) || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    });
    rows.push(values.join(delimiter));
  }

  return rows.join('\n');
}
