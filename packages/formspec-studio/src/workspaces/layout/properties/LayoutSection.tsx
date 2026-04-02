/** @filedesc Layout properties section for CSS Grid placement (column span, row span) — editable number inputs. */
import { Section } from '../../../components/ui/Section';
import { NumberPropertyInput } from '../../../components/ui/PropertyInput';

export function LayoutSection({
  nodeProps,
  onSetProp,
}: {
  nodeProps: Record<string, unknown>;
  onSetProp: (key: string, value: unknown) => void;
}) {
  const colSpan = (nodeProps.gridColumnSpan as number | '') ?? '';
  const rowSpan = (nodeProps.gridRowSpan as number | '') ?? '';

  return (
    <Section title="Layout">
      <NumberPropertyInput
        label="Column Span"
        value={colSpan}
        min={1}
        max={12}
        onCommit={(v) => onSetProp('gridColumnSpan', v)}
      />
      <NumberPropertyInput
        label="Row Span"
        value={rowSpan}
        min={1}
        onCommit={(v) => onSetProp('gridRowSpan', v)}
      />
    </Section>
  );
}
