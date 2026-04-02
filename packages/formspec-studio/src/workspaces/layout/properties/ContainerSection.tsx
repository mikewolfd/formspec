/** @filedesc Layout properties section for container component properties (direction, gap, columns, padding, etc.) — fully editable. */
import { Section } from '../../../components/ui/Section';
import {
  TextPropertyInput,
  NumberPropertyInput,
  SelectPropertyInput,
  CheckboxPropertyInput,
} from '../../../components/ui/PropertyInput';

const DIRECTION_OPTIONS = [
  { value: 'column', label: 'column' },
  { value: 'row', label: 'row' },
  { value: 'column-reverse', label: 'column-reverse' },
  { value: 'row-reverse', label: 'row-reverse' },
];

const ALIGN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
];

const WRAP_OPTIONS = [
  { value: 'nowrap', label: 'nowrap' },
  { value: 'wrap', label: 'wrap' },
];

const ELEVATION_OPTIONS = [
  { value: '', label: '—' },
  { value: 'flat', label: 'flat' },
  { value: 'raised', label: 'raised' },
  { value: 'floating', label: 'floating' },
];

const PANEL_POSITION_OPTIONS = [
  { value: '', label: '—' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'float', label: 'float' },
];

export function ContainerSection({
  componentType,
  nodeProps,
  onSetProp,
}: {
  componentType: string;
  nodeProps: Record<string, unknown>;
  onSetProp: (key: string, value: unknown) => void;
}) {
  const direction = (nodeProps.direction as string) ?? 'column';
  const gap = (nodeProps.gap as string) ?? '';
  const padding = (nodeProps.padding as string) ?? '';
  const align = (nodeProps.align as string) ?? '';
  const wrap = (nodeProps.wrap as string) ?? 'nowrap';
  const columns = (nodeProps.columns as number | '') ?? '';
  const elevation = (nodeProps.elevation as string) ?? '';
  const position = (nodeProps.position as string) ?? '';
  const width = (nodeProps.width as string) ?? '';
  const label = (nodeProps.label as string) ?? '';
  const defaultOpen = (nodeProps.defaultOpen as boolean) ?? false;

  if (componentType === 'Stack') {
    return (
      <Section title="Container">
        <SelectPropertyInput
          label="Direction"
          value={direction}
          options={DIRECTION_OPTIONS}
          onChange={(v) => onSetProp('direction', v)}
        />
        <TextPropertyInput
          label="Gap"
          value={gap}
          placeholder="e.g. md, 16px"
          onCommit={(v) => onSetProp('gap', v || null)}
        />
        <TextPropertyInput
          label="Padding"
          value={padding}
          placeholder="e.g. sm, 8px"
          onCommit={(v) => onSetProp('padding', v || null)}
        />
        <SelectPropertyInput
          label="Align"
          value={align}
          options={ALIGN_OPTIONS}
          onChange={(v) => onSetProp('align', v || null)}
        />
        <SelectPropertyInput
          label="Wrap"
          value={wrap}
          options={WRAP_OPTIONS}
          onChange={(v) => onSetProp('wrap', v)}
        />
      </Section>
    );
  }

  if (componentType === 'Grid') {
    return (
      <Section title="Container">
        <NumberPropertyInput
          label="Columns"
          value={columns}
          min={1}
          max={12}
          onCommit={(v) => onSetProp('columns', v)}
        />
        <TextPropertyInput
          label="Gap"
          value={gap}
          placeholder="e.g. md, 16px"
          onCommit={(v) => onSetProp('gap', v || null)}
        />
        <TextPropertyInput
          label="Padding"
          value={padding}
          placeholder="e.g. sm, 8px"
          onCommit={(v) => onSetProp('padding', v || null)}
        />
      </Section>
    );
  }

  if (componentType === 'Card') {
    return (
      <Section title="Container">
        <TextPropertyInput
          label="Padding"
          value={padding}
          placeholder="e.g. md, 16px"
          onCommit={(v) => onSetProp('padding', v || null)}
        />
        <SelectPropertyInput
          label="Elevation"
          value={elevation}
          options={ELEVATION_OPTIONS}
          onChange={(v) => onSetProp('elevation', v || null)}
        />
      </Section>
    );
  }

  if (componentType === 'Panel') {
    return (
      <Section title="Container">
        <SelectPropertyInput
          label="Position"
          value={position}
          options={PANEL_POSITION_OPTIONS}
          onChange={(v) => onSetProp('position', v || null)}
        />
        <TextPropertyInput
          label="Width"
          value={width}
          placeholder="e.g. 300px, 30%"
          onCommit={(v) => onSetProp('width', v || null)}
        />
      </Section>
    );
  }

  if (componentType === 'Collapsible' || componentType === 'Accordion') {
    return (
      <Section title="Container">
        <TextPropertyInput
          label="Title"
          value={label}
          placeholder="Section title"
          onCommit={(v) => onSetProp('label', v || null)}
        />
        <CheckboxPropertyInput
          label="Default Open"
          checked={defaultOpen}
          onChange={(v) => onSetProp('defaultOpen', v)}
        />
      </Section>
    );
  }

  // Generic fallback for unknown container types
  return (
    <Section title="Container">
      <TextPropertyInput
        label="Gap"
        value={gap}
        placeholder="e.g. md, 16px"
        onCommit={(v) => onSetProp('gap', v || null)}
      />
      <TextPropertyInput
        label="Padding"
        value={padding}
        placeholder="e.g. sm, 8px"
        onCommit={(v) => onSetProp('padding', v || null)}
      />
    </Section>
  );
}
