/** @filedesc Blueprint section displaying top-level form settings (title, version, status, page mode). */
import { useDefinition } from '../../state/useDefinition';
import { PropertyRow } from '../ui/PropertyRow';
import { Pill } from '../ui/Pill';

export function SettingsSection() {
  const definition = useDefinition();
  const presentation = definition.formPresentation ?? {};

  return (
    <div className="space-y-0.5">
      <PropertyRow label="Title">{definition.title ?? '—'}</PropertyRow>
      <PropertyRow label="Version">{definition.version}</PropertyRow>
      {definition.status && (
        <PropertyRow label="Status">
          <Pill text={definition.status} color="accent" size="sm" />
        </PropertyRow>
      )}
      {presentation.pageMode && (
        <PropertyRow label="Page Mode">{presentation.pageMode}</PropertyRow>
      )}
      {definition.nonRelevantBehavior && (
        <PropertyRow label="Non-Relevant">{definition.nonRelevantBehavior}</PropertyRow>
      )}
    </div>
  );
}
