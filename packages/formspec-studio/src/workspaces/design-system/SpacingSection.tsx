/** @filedesc Design mode section — form spacing and density. */
import { useProject } from '../../state/useProject';
import { useProjectState } from '../../state/useProjectState';
import { getTokensByGroup } from '@formspec-org/studio-core';

export function SpacingSection() {
  const project = useProject();
  useProjectState();

  const spacingTokens = getTokensByGroup(project, 'spacing');

  const setToken = (key: string, value: string | null) => {
    project.setToken(key, value);
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-[19px] font-semibold text-ink tracking-tight">Spacing</h3>
        <p className="text-[13px] text-muted mt-1">Adjust the density and white space of your form elements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spacingTokens.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-[13px] text-muted">
            No spacing presets defined.
          </div>
        )}

        {spacingTokens.map(({ key, name, value }) => (
          <div key={key} className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold text-ink uppercase tracking-wider">{name}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-8 bg-subtle/50 rounded flex items-center justify-center overflow-hidden">
                <div
                  className="bg-accent/40 border border-accent/20 h-full transition-all"
                  style={{ width: value }}
                />
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => setToken(key, e.target.value)}
                className="w-20 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-mono text-ink text-center outline-none focus:border-accent/40"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
