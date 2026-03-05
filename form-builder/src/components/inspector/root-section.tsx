import { definition, updateDefinition } from '../../state/definition';
import { project } from '../../state/project';

export function RootSection() {
    const def = definition.value;
    const theme = (project.value.theme as Record<string, any> | null) ?? null;

    function updateRoot(field: string, value: string) {
        updateDefinition((d) => {
            (d as Record<string, unknown>)[field] = value || undefined;
        });
    }

    function updatePresentation(field: string, value: string) {
        updateDefinition((d) => {
            if (!d.formPresentation) d.formPresentation = {};
            (d.formPresentation as Record<string, unknown>)[field] = value || undefined;
        });
    }

    const presentation = def.formPresentation || {};
    const tokens = (theme?.tokens as Record<string, string> | undefined) ?? {};

    function updateThemeToken(tokenKey: string, value: string) {
        const current = (project.value.theme as Record<string, any> | null) ?? {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: def.url },
            tokens: {},
            selectors: [],
        };

        const nextTokens = {
            ...(current.tokens ?? {}),
            [tokenKey]: value || undefined,
        };

        project.value = {
            ...project.value,
            theme: {
                ...current,
                targetDefinition: { url: def.url },
                tokens: nextTokens,
            },
        };
    }

    return (
        <div class="properties-content">
            <div class="property-type-header">
                <span class="property-type-dot" style={{ background: 'var(--accent)' }} />
                Form Root
            </div>

            <div class="section-title">Definition</div>
            <div class="property-row">
                <label class="property-label">Title</label>
                <input
                    class="studio-input"
                    value={def.title ?? ''}
                    onInput={(e) => updateRoot('title', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">URL</label>
                <input
                    class="studio-input studio-input-mono"
                    value={def.url ?? ''}
                    onInput={(e) => updateRoot('url', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Version</label>
                <input
                    class="studio-input studio-input-mono"
                    value={def.version ?? ''}
                    placeholder="0.1.0"
                    onInput={(e) => updateRoot('version', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Status</label>
                <select
                    class="studio-select"
                    value={(def as Record<string, unknown>).status as string ?? 'draft'}
                    onChange={(e) => updateRoot('status', (e.target as HTMLSelectElement).value)}
                >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="retired">retired</option>
                </select>
            </div>
            <div class="property-row">
                <label class="property-label">Description</label>
                <textarea
                    class="studio-textarea"
                    value={(def as Record<string, unknown>).description as string ?? ''}
                    placeholder="Describe this form..."
                    onInput={(e) => updateRoot('description', (e.target as HTMLTextAreaElement).value)}
                />
            </div>

            <div class="section-title">Presentation</div>
            <div class="property-row">
                <label class="property-label">Paging Mode</label>
                <select
                    class="studio-select"
                    value={presentation.pageMode ?? 'single'}
                    onChange={(e) => updatePresentation('pageMode', (e.target as HTMLSelectElement).value)}
                >
                    <option value="single">Single Page</option>
                    <option value="wizard">Wizard</option>
                    <option value="tabs">Tabs</option>
                </select>
            </div>
            <div class="property-row">
                <label class="property-label">Label Position</label>
                <select
                    class="studio-select"
                    value={presentation.labelPosition ?? 'top'}
                    onChange={(e) => updatePresentation('labelPosition', (e.target as HTMLSelectElement).value)}
                >
                    <option value="top">Top</option>
                    <option value="start">Start (Left/Right)</option>
                    <option value="hidden">Hidden</option>
                </select>
            </div>
            <div class="property-row">
                <label class="property-label">Density</label>
                <select
                    class="studio-select"
                    value={presentation.density ?? 'comfortable'}
                    onChange={(e) => updatePresentation('density', (e.target as HTMLSelectElement).value)}
                >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                </select>
            </div>
            <div class="property-row">
                <label class="property-label">Default Currency</label>
                <input
                    class="studio-input studio-input-mono"
                    value={presentation.defaultCurrency ?? ''}
                    placeholder="USD"
                    onInput={(e) => updatePresentation('defaultCurrency', (e.target as HTMLInputElement).value)}
                />
            </div>

            <div class="section-title">Brand</div>
            <div class="property-row">
                <label class="property-label">Primary</label>
                <input
                    class="studio-input studio-input-mono"
                    value={tokens['color.primary'] ?? ''}
                    placeholder="#1a73e8"
                    onInput={(e) => updateThemeToken('color.primary', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Secondary</label>
                <input
                    class="studio-input studio-input-mono"
                    value={tokens['color.secondary'] ?? ''}
                    placeholder="#f5f5f5"
                    onInput={(e) => updateThemeToken('color.secondary', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Error</label>
                <input
                    class="studio-input studio-input-mono"
                    value={tokens['color.error'] ?? ''}
                    placeholder="#d93025"
                    onInput={(e) => updateThemeToken('color.error', (e.target as HTMLInputElement).value)}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Font</label>
                <input
                    class="studio-input"
                    value={tokens['typography.family.base'] ?? ''}
                    placeholder="Inter"
                    onInput={(e) => updateThemeToken('typography.family.base', (e.target as HTMLInputElement).value)}
                />
            </div>
        </div>
    );
}
