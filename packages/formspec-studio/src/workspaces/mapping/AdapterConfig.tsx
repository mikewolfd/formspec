/** @filedesc Mapping tab section for configuring format-specific adapter options (JSON, XML, CSV). */
import { useState } from 'react';
import { useProject } from '../../state/useProject';
import { useMapping } from '../../state/useMapping';
import { Section } from '../../components/ui/Section';
import { Pill } from '../../components/ui/Pill';

type AdapterFormat = 'json' | 'xml' | 'csv';

const inputClass =
  'w-20 px-1.5 py-0.5 text-[11px] font-mono border border-border rounded-[3px] bg-subtle outline-none focus:border-accent transition-colors';

const selectClass =
  'px-1.5 py-0.5 text-[11px] font-ui border border-border rounded-[3px] bg-subtle outline-none focus:border-accent transition-colors';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function AdapterConfig() {
  const mapping = useMapping();
  const project = useProject();

  const format = (mapping?.targetSchema as Record<string, unknown> | undefined)?.format as
    | AdapterFormat
    | string
    | undefined;
  const adapters = (mapping as Record<string, unknown> | undefined)?.adapters as
    | Record<string, Record<string, unknown>>
    | undefined;
  const config = format ? (adapters?.[format] ?? {}) : {};

  const setAdapterProp = (prop: string, value: unknown) => {
    if (!format) return;
    const currentAdapters = adapters ?? {};
    const currentConfig = currentAdapters[format] ?? {};
    project.setMappingProperty('adapters', {
      ...currentAdapters,
      [format]: { ...currentConfig, [prop]: value },
    });
  };

  if (!format) {
    return (
      <Section title="Adapter">
        <div className="text-sm text-muted">
          Set a target schema format (json, xml, csv) to configure adapter options.
        </div>
      </Section>
    );
  }

  return (
    <Section title="Adapter">
      <div className="flex flex-col gap-2 text-sm">
        <Row label="Format">
          <Pill text={format} color="accent" />
        </Row>

        {format === 'json' && <JsonOptions config={config} onChange={setAdapterProp} />}
        {format === 'xml' && <XmlOptions config={config} onChange={setAdapterProp} />}
        {format === 'csv' && <CsvOptions config={config} onChange={setAdapterProp} />}
      </div>
    </Section>
  );
}

// ── JSON ────────────────────────────────────────────────────────────

function JsonOptions({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (prop: string, value: unknown) => void;
}) {
  const nullHandling = (config.nullHandling as string) ?? 'include';
  const sortKeys = (config.sortKeys as boolean) ?? false;

  return (
    <>
      <Row label="Null handling">
        <select
          className={selectClass}
          value={nullHandling}
          onChange={(e) => onChange('nullHandling', e.target.value)}
        >
          <option value="include">Include</option>
          <option value="omit">Omit</option>
        </select>
      </Row>
      <Row label="Sort keys">
        <Toggle checked={sortKeys} onChange={(v) => onChange('sortKeys', v)} label="Sort keys" />
      </Row>
    </>
  );
}

// ── XML ─────────────────────────────────────────────────────────────

function XmlOptions({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (prop: string, value: unknown) => void;
}) {
  const declaration = (config.declaration as boolean) ?? true;
  const indent = (config.indent as number) ?? 2;
  const cdata = (config.cdata as string[]) ?? [];
  const [cdataInput, setCdataInput] = useState(cdata.join(', '));

  const commitCdata = () => {
    const paths = cdataInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange('cdata', paths);
  };

  return (
    <>
      <Row label="XML declaration">
        <Toggle
          checked={declaration}
          onChange={(v) => onChange('declaration', v)}
          label="Include XML declaration"
        />
      </Row>
      <Row label="Indent (spaces)">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={indent}
          onChange={(e) => onChange('indent', Math.max(0, parseInt(e.target.value, 10) || 0))}
        />
      </Row>
      <div className="flex flex-col gap-1">
        <span className="text-muted text-sm">CDATA paths</span>
        <input
          type="text"
          className={`${inputClass} w-full`}
          placeholder="order.notes, order.description"
          value={cdataInput}
          onChange={(e) => setCdataInput(e.target.value)}
          onBlur={commitCdata}
        />
      </div>
    </>
  );
}

// ── CSV ─────────────────────────────────────────────────────────────

function CsvOptions({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (prop: string, value: unknown) => void;
}) {
  const delimiter = (config.delimiter as string) ?? ',';
  const header = (config.header as boolean) ?? true;
  const quote = (config.quote as string) ?? '"';
  const lineEnding = (config.lineEnding as string) ?? 'crlf';

  return (
    <>
      <Row label="Delimiter">
        <input
          type="text"
          className={inputClass}
          maxLength={1}
          value={delimiter}
          onChange={(e) => onChange('delimiter', e.target.value || ',')}
        />
      </Row>
      <Row label="Header row">
        <Toggle checked={header} onChange={(v) => onChange('header', v)} label="Header row" />
      </Row>
      <Row label="Quote character">
        <input
          type="text"
          className={inputClass}
          maxLength={1}
          value={quote}
          onChange={(e) => onChange('quote', e.target.value || '"')}
        />
      </Row>
      <Row label="Line ending">
        <select
          className={selectClass}
          value={lineEnding}
          onChange={(e) => onChange('lineEnding', e.target.value)}
        >
          <option value="crlf">CRLF</option>
          <option value="lf">LF</option>
        </select>
      </Row>
    </>
  );
}
