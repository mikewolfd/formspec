import { definition, updateDefinition, setDefinition } from '../state/definition';
import { centerPanelMode, commandBarOpen, showTemplatePicker, structurePanelOpen } from '../state/project';
import { handleImport, handleExport } from '../logic/import-export';

export function Topbar() {
    const def = definition.value;
    const version = def?.version ?? '0.1.0';
    const status = (def as { status?: string })?.status ?? 'draft';
    const isSplash = showTemplatePicker.value;

    return (
        <header class="studio-topbar">
            <div class="topbar-brand">
                <div class="topbar-logo">
                    <svg viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#fff" opacity="1" />
                        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#fff" opacity="0.6" />
                        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#fff" opacity="0.6" />
                        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#fff" opacity="0.3" />
                    </svg>
                </div>
                <span class="topbar-brand-text">
                    Formspec <span class="topbar-brand-accent">Studio</span>
                </span>
            </div>

            {!isSplash && (
                <div class="topbar-center">
                    <input
                        class="topbar-title-input"
                        value={def.title ?? 'Untitled Form'}
                        onInput={(event) => {
                            const next = (event.target as HTMLInputElement).value;
                            updateDefinition((d) => { d.title = next; });
                        }}
                        aria-label="Form title"
                    />
                    <span class="topbar-meta">
                        <span class="topbar-status">{status}</span>
                        <span>v{version}</span>
                    </span>
                </div>
            )}

            {!isSplash && (
                <div class="topbar-actions">
                    <button
                        class={`btn-ghost${centerPanelMode.value === 'document' ? ' active' : ''}`}
                        onClick={() => { centerPanelMode.value = 'document'; }}
                        aria-label="Document mode"
                    >
                        Document
                    </button>
                    <button
                        class={`btn-ghost${centerPanelMode.value === 'preview' ? ' active' : ''}`}
                        onClick={() => { centerPanelMode.value = 'preview'; }}
                        aria-label="Preview mode"
                    >
                        Preview
                    </button>
                    <button
                        class={`btn-ghost${structurePanelOpen.value ? ' active' : ''}`}
                        onClick={() => { structurePanelOpen.value = !structurePanelOpen.value; }}
                        aria-label="Toggle structure panel"
                    >
                        Structure
                    </button>
                    <button
                        class="btn-ghost"
                        onClick={() => { commandBarOpen.value = true; }}
                        title="Command palette (⌘K)"
                    >
                        ⌘K
                    </button>
                    <button
                        class="btn-ghost"
                        aria-label="Import"
                        onClick={() => handleImport(setDefinition)}
                    >
                        ↓ Import
                    </button>
                    <button
                        class="btn-primary"
                        aria-label="Export"
                        onClick={() => handleExport(def)}
                    >
                        ↑ Export
                    </button>
                </div>
            )}
        </header>
    );
}
