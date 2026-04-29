/** @filedesc Design mode section — text sizes and typography scale. */
import { useProject } from '../../state/useProject';
import { useProjectState } from '../../state/useProjectState';
import { getTokensByGroup } from '@formspec-org/studio-core';

export function TextSizesSection() {
  const project = useProject();
  useProjectState();

  const fontTokens = getTokensByGroup(project, 'fontSize');

  const setToken = (key: string, value: string | null) => {
    project.setToken(key, value);
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-[19px] font-semibold text-ink tracking-tight">Typography</h3>
        <p className="text-[13px] text-muted mt-1">Control the visual hierarchy and readability of your form.</p>
      </div>

      <div className="space-y-4">
        {fontTokens.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="text-[13px] text-muted">No text sizes defined.</div>
            <button
              onClick={() => setToken('fontSize.base', '16px')}
              className="mt-3 text-[13px] font-bold text-accent"
            >
              Initialize typography
            </button>
          </div>
        )}

        {fontTokens.map(({ key, name, value }) => (
          <div key={key} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-6">
            <div className="w-16 text-[11px] font-bold text-muted uppercase tracking-widest">{name}</div>
            <div className="flex-1">
              <div
                className="truncate text-ink mb-1"
                style={{ fontSize: value }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setToken(key, e.target.value)}
                className="w-20 rounded-md border border-border bg-subtle/30 px-3 py-1.5 text-[13px] font-mono text-ink text-center focus:border-accent/40 focus:ring-2 focus:ring-accent/10 outline-none transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 flex gap-3">
        <span className="text-[18px]">💡</span>
        <div className="text-[13px] text-amber-700 dark:text-amber-300">
          <strong>Tip:</strong> Prefer using relative units like <code>rem</code> or <code>px</code> consistent with your brand guidelines.
        </div>
      </div>
    </section>
  );
}
