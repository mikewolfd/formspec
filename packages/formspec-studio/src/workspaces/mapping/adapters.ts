/** @filedesc Client-side adapters for serializing mapped data to XML, CSV, and JSON for the preview. */

export interface AdapterOptions {
  format?: 'json' | 'xml' | 'csv';
  // From targetSchema
  rootElement?: string;
  namespaces?: Record<string, string>;
  // JSON adapter
  pretty?: boolean;
  sortKeys?: boolean;
  nullHandling?: 'include' | 'omit';
  // XML adapter
  declaration?: boolean;
  indent?: number;
  cdata?: string[];
  // CSV adapter
  delimiter?: string;
  quote?: string;
  header?: boolean;
  lineEnding?: 'crlf' | 'lf';
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
        return toJSON(data, options);
    }
  } catch (err: any) {
    return `Serialization Error: ${err.message}`;
  }
}

// ── JSON ────────────────────────────────────────────────────────────

function stripNulls(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj !== 'object' || obj === null) return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null) out[k] = stripNulls(v);
  }
  return out;
}

function sortKeysDeep(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (typeof obj !== 'object' || obj === null) return obj;
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortKeysDeep(obj[k]);
  }
  return out;
}

function toJSON(data: any, options: AdapterOptions): string {
  let output = data;
  if (options.nullHandling === 'omit') output = stripNulls(output);
  if (options.sortKeys) output = sortKeysDeep(output);
  const indent = options.pretty !== false ? 2 : undefined;
  return JSON.stringify(output, null, indent);
}

// ── XML ─────────────────────────────────────────────────────────────

function toXML(data: any, options: AdapterOptions): string {
  const root = options.rootElement || 'root';
  const namespaces = options.namespaces || {};
  const indentSize = options.indent ?? 2;
  const cdataPaths = new Set(options.cdata ?? []);

  let xml = '';
  if (options.declaration !== false) {
    xml += '<?xml version="1.0" encoding="UTF-8"?>';
    xml += indentSize > 0 ? '\n' : '';
  }

  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => ` xmlns${prefix ? `:${prefix}` : ''}="${uri}"`)
    .join('');

  xml += `<${root}${nsAttrs}>`;
  xml += indentSize > 0 ? '\n' : '';
  xml += serializeXmlNode(data, 1, indentSize, cdataPaths, '');
  xml += `</${root}>`;

  return xml;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function serializeXmlNode(data: any, depth: number, indentSize: number, cdataPaths: Set<string>, currentPath: string): string {
  if (data === null || data === undefined) return '';
  const indent = indentSize > 0 ? ' '.repeat(indentSize).repeat(depth) : '';
  const nl = indentSize > 0 ? '\n' : '';

  if (typeof data !== 'object') {
    return String(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeXmlNode(item, depth, indentSize, cdataPaths, currentPath)).join(nl);
  }

  // Handle attributes first (@ prefix)
  const attrs = Object.entries(data)
    .filter(([key]) => key.startsWith('@'))
    .map(([key, val]) => ` ${key.slice(1)}="${escapeXml(String(val))}"`)
    .join('');

  // Handle children
  const children = Object.entries(data)
    .filter(([key]) => !key.startsWith('@'))
    .map(([key, val]) => {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      if (typeof val === 'object' && val !== null) {
        return `${indent}<${key}${attrs}>${nl}${serializeXmlNode(val, depth + 1, indentSize, cdataPaths, childPath)}${nl}${indent}</${key}>`;
      }
      const text = String(val ?? '');
      const content = cdataPaths.has(childPath) ? `<![CDATA[${text}]]>` : escapeXml(text);
      return `${indent}<${key}>${content}</${key}>`;
    })
    .join(nl);

  return children;
}

// ── CSV ─────────────────────────────────────────────────────────────

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
  const quoteChar = options.quote || '"';
  const includeHeader = options.header !== false;
  const eol = options.lineEnding === 'lf' ? '\n' : '\r\n';

  const headers = Object.keys(data[0]);
  const rows: string[] = [];

  if (includeHeader) {
    rows.push(headers.map(h => csvField(h, delimiter, quoteChar)).join(delimiter));
  }

  for (const item of data) {
    const values = headers.map(h => {
      const val = item[h];
      const str = val === null || val === undefined ? '' : String(val);
      return csvField(str, delimiter, quoteChar);
    });
    rows.push(values.join(delimiter));
  }

  return rows.join(eol);
}

function csvField(str: string, delimiter: string, quoteChar: string): string {
  if (str.includes(delimiter) || str.includes(quoteChar) || str.includes('\n') || str.includes('\r')) {
    const escaped = str.replace(new RegExp(escapeRegExp(quoteChar), 'g'), quoteChar + quoteChar);
    return `${quoteChar}${escaped}${quoteChar}`;
  }
  return str;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
