import { signal } from '@preact/signals';
import { definition, definitionVersion, findBindByPath, findItemByKey } from '../../state/definition';
import { componentDoc, componentVersion, diagnostics } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { resolveNode, classifyNode, nodeKindColor } from '../../logic/component-tree';

import { IdentitySection } from './identity-section';
import { DataSection } from './data-section';
import { BehaviorSection } from './behavior-section';
import { ValidationSection } from './validation-section';
import { LayoutSection } from './layout-section';
import { RootSection } from './root-section';
import { ShapesSection } from './shapes-section';

type InspectorTab = 'properties' | 'diagnostics';
type InspectorMode = 'simple' | 'advanced';

const activeTab = signal<InspectorTab>('properties');
const inspectorMode = signal<InspectorMode>('simple');
const sectionState = signal<Record<string, boolean>>({
    basics: true,
    logic: false,
    validation: false,
});

export function InspectorPanel({
    collapsed,
    onToggle,
}: {
    collapsed: boolean;
    onToggle: () => void;
}) {
    const diags = diagnostics.value;
    const errorCount = diags.filter((d) => d.severity === 'error').length;

    if (collapsed) {
        return (
            <button class="inspector-toggle-btn" onClick={onToggle} title="Open inspector">
                ◀
            </button>
        );
    }

    return (
        <div class="inspector-panel">
            <div class="inspector-header">
                <div class="inspector-tabs" role="tablist">
                    <button
                        role="tab"
                        class={`inspector-tab${activeTab.value === 'properties' ? ' active' : ''}`}
                        onClick={() => { activeTab.value = 'properties'; }}
                        aria-selected={activeTab.value === 'properties'}
                    >
                        Inspector
                    </button>
                    <button
                        role="tab"
                        class={`inspector-tab${activeTab.value === 'diagnostics' ? ' active' : ''}`}
                        onClick={() => { activeTab.value = 'diagnostics'; }}
                        aria-selected={activeTab.value === 'diagnostics'}
                    >
                        Diagnostics
                        {errorCount > 0 && <span class="diagnostics-badge">{errorCount}</span>}
                    </button>
                </div>
                <button class="inspector-close" onClick={onToggle} title="Close inspector">×</button>
            </div>

            <div class="inspector-body" role="tabpanel">
                {activeTab.value === 'properties' ? <PropertiesContent /> : <DiagnosticsContent />}
            </div>
        </div>
    );
}

function PropertiesContent() {
    definitionVersion.value;
    componentVersion.value;

    const path = selectedPath.value;

    if (path === null) {
        return (
            <div class="inspector-empty">
                <span class="inspector-empty-icon">👆</span>
                <span>Select an item in the tree<br />to inspect its properties</span>
            </div>
        );
    }

    if (path === '') {
        return (
            <>
                <RootSection />
                <ShapesSection />
            </>
        );
    }

    const doc = componentDoc.value;
    if (!doc) {
        return <div class="inspector-empty">No component tree loaded</div>;
    }

    const node = resolveNode(doc.tree, path);
    if (!node) {
        return <div class="inspector-empty">Node not found</div>;
    }

    const kind = classifyNode(node);
    const color = nodeKindColor(kind);

    if ((kind === 'bound-input' || kind === 'group' || kind === 'bound-display') && node.bind) {
        const found = findItemByKey(node.bind);
        if (found) {
            const item = found.item;
            const kindLabel = kind === 'bound-input' ? 'Field' : kind === 'group' ? 'Group' : 'Display';

            return (
                <div class="properties-content">
                    <div class="property-type-header">
                        <span class="property-type-dot" style={{ background: color }} />
                        {kindLabel} — {node.component}
                    </div>

                    {kind === 'bound-input' && (
                        <div class="inspector-mode-toggle">
                            <button
                                class={`inspector-mode-btn${inspectorMode.value === 'simple' ? ' active' : ''}`}
                                onClick={() => { inspectorMode.value = 'simple'; }}
                            >
                                Simple
                            </button>
                            <button
                                class={`inspector-mode-btn${inspectorMode.value === 'advanced' ? ' active' : ''}`}
                                onClick={() => { inspectorMode.value = 'advanced'; }}
                            >
                                Advanced
                            </button>
                        </div>
                    )}

                    <InspectorSection
                        id="basics"
                        title="Basics"
                        summary={item.label || item.key}
                    >
                        <IdentitySection item={item} />
                        {kind === 'bound-input' && <DataSection item={item} />}
                    </InspectorSection>

                    {(kind === 'bound-input' || kind === 'group') && (
                        <InspectorSection
                            id="logic"
                            title="Logic"
                            summary={logicSummary(found.path, item)}
                        >
                            <BehaviorSection
                                item={item}
                                inspectorMode={inspectorMode.value}
                                showHeader={false}
                            />
                        </InspectorSection>
                    )}

                    {kind === 'bound-input' && (
                        <InspectorSection
                            id="validation"
                            title="Validation"
                            summary={validationSummary(found.path, item)}
                        >
                            <ValidationSection item={item} />
                        </InspectorSection>
                    )}
                </div>
            );
        }
    }

    return <LayoutSection node={node} path={path} />;
}

function InspectorSection({
    id,
    title,
    summary,
    children,
}: {
    id: 'basics' | 'logic' | 'validation';
    title: string;
    summary?: string;
    children: any;
}) {
    const isOpen = sectionState.value[id] ?? false;
    return (
        <div class="inspector-section" data-section={id}>
            <button
                class="inspector-section-toggle"
                onClick={() => {
                    sectionState.value = {
                        ...sectionState.value,
                        [id]: !isOpen,
                    };
                }}
            >
                <span class="inspector-section-title">{title}</span>
                {!isOpen && summary && <span class="inspector-section-summary">{summary}</span>}
                <span class="inspector-section-chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && <div class="inspector-section-body">{children}</div>}
        </div>
    );
}

function hasLogic(bindLike: Record<string, unknown> | undefined, key: string): boolean {
    if (!bindLike) return false;
    const value = bindLike[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value;
    return true;
}

function logicSummary(path: string, item: Record<string, unknown>): string {
    const bind = (findBindByPath(definition.value, path) || {}) as Record<string, unknown>;
    const parts: string[] = [];

    if (hasLogic(bind, 'required') || hasLogic(item, 'required')) parts.push('Required');
    if (hasLogic(bind, 'relevant') || hasLogic(item, 'relevant')) parts.push('Show when');
    if (hasLogic(bind, 'calculate') || hasLogic(item, 'calculate')) parts.push('Calculated');
    if (hasLogic(bind, 'readonly') || hasLogic(item, 'readonly')) parts.push('Read only');

    return parts.join(' · ');
}

function validationSummary(path: string, item: Record<string, unknown>): string {
    const bind = (findBindByPath(definition.value, path) || {}) as Record<string, unknown>;
    if (hasLogic(bind, 'constraint') || hasLogic(item, 'constraint')) return 'Constraint';
    return '';
}

function DiagnosticsContent() {
    const diags = diagnostics.value;

    if (diags.length === 0) {
        return (
            <div class="diagnostics-empty">
                <span class="diagnostics-check">✓</span>
                <span>No issues found</span>
            </div>
        );
    }

    const errors = diags.filter((d) => d.severity === 'error');
    const warnings = diags.filter((d) => d.severity === 'warning');
    const infos = diags.filter((d) => d.severity === 'info');

    return (
        <div class="diagnostics-list">
            <div class="diagnostics-summary">
                {errors.length > 0 && <span class="diagnostics-pill error">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
                {warnings.length > 0 && <span class="diagnostics-pill warning">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>}
                {infos.length > 0 && <span class="diagnostics-pill info">{infos.length} info</span>}
            </div>

            {diags.map((diag, i) => (
                <div
                    key={`${diag.path}-${i}`}
                    class="diagnostics-row"
                    onClick={() => { if (diag.path) selectedPath.value = diag.path; }}
                >
                    <span class={`diagnostics-icon ${diag.severity}`}>
                        {diag.severity === 'error' ? '●' : diag.severity === 'warning' ? '▲' : 'ℹ'}
                    </span>
                    <div>
                        <div class="diagnostics-message">{diag.message}</div>
                        {diag.path && <div class="diagnostics-path">{diag.path}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}
