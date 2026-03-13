import { useDefinition } from '../../state/useDefinition';
import { Section } from '../ui/Section';
import { PropertyRow } from '../ui/PropertyRow';
import { Pill } from '../ui/Pill';

export function SettingsSection() {
  const definition = useDefinition();
  const def = definition as any;
  const presentation = def.formPresentation ?? {};

  const openSettings = () => {
    window.dispatchEvent(new CustomEvent('formspec:open-settings'));
  };

  return (
    <Section title="Settings">
      <div className="space-y-0.5">
        <PropertyRow label="Title">{def.title ?? '—'}</PropertyRow>
        <PropertyRow label="Version">{def.version}</PropertyRow>
        {def.status && (
          <PropertyRow label="Status">
            <Pill text={def.status} color="accent" size="sm" />
          </PropertyRow>
        )}
        {presentation.pageMode && (
          <PropertyRow label="Page Mode">{presentation.pageMode}</PropertyRow>
        )}
        {def.nonRelevantBehavior && (
          <PropertyRow label="Non-Relevant">{def.nonRelevantBehavior}</PropertyRow>
        )}
      </div>
      <button
        type="button"
        data-testid="settings-edit-btn"
        className="mt-3 w-full text-[12px] font-medium text-accent hover:underline text-left"
        onClick={openSettings}
      >
        Edit settings…
      </button>
    </Section>
  );
}
