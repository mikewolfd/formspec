import { definition, addShape, updateShape, removeShape } from '../../state/definition';
import { FelExpressionInput } from '../properties/fel-expression-input';
import { FelHelper } from '../properties/fel-helper';

export function ShapesSection() {
    const shapes = definition.value.shapes || [];

    function createNewShape() {
        // Generating a short simple id
        const randomStr = Math.random().toString(36).substring(2, 6);
        addShape({
            id: `rule_${randomStr}`,
            target: '#',
            severity: 'error',
            constraint: '',
            message: 'Validation failed',
        });
    }

    return (
        <div class="properties-content">
            <div class="section-header">
                <div class="section-title">Cross-Field Validation</div>
                <FelHelper />
            </div>

            <div class="property-row" style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Shapes define form-level or cross-field validation rules (e.g. "Total must equal budget").
            </div>

            {shapes.map((shape) => (
                <div key={shape.id} style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius)',
                    padding: '12px',
                    marginBottom: '1rem',
                    background: 'var(--bg-card)'
                }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            class="studio-input studio-input-mono"
                            style={{ flex: 1, fontWeight: 500 }}
                            value={shape.id}
                            placeholder="Shape ID"
                            onInput={(e) => updateShape(shape.id, { id: (e.target as HTMLInputElement).value })}
                        />
                        <button
                            class="btn-ghost"
                            style={{ color: 'var(--error)' }}
                            onClick={() => removeShape(shape.id)}
                            title="Remove Rule"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="property-row">
                        <label class="property-label">Severity</label>
                        <select
                            class="studio-select"
                            value={shape.severity || 'error'}
                            onChange={(e) => updateShape(shape.id, { severity: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="error">Error</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                        </select>
                    </div>

                    <div class="property-row">
                        <label class="property-label">Target Field Path or '#'</label>
                        <input
                            class="studio-input studio-input-mono"
                            value={shape.target || '#'}
                            placeholder="e.g., items[*].total or #"
                            title="Use '#' for form-level, or a dotted path for a specific field"
                            onInput={(e) => updateShape(shape.id, { target: (e.target as HTMLInputElement).value })}
                        />
                    </div>

                    <div class="property-row">
                        <label class="property-label">Constraint (FEL)</label>
                        <FelExpressionInput
                            value={shape.constraint || ''}
                            placeholder="e.g. $start <= $end"
                            onValueChange={(val) => updateShape(shape.id, { constraint: val })}
                        />
                    </div>

                    <div class="property-row">
                        <label class="property-label">Validation Message</label>
                        <input
                            class="studio-input"
                            value={shape.message || ''}
                            placeholder="Error message"
                            onInput={(e) => updateShape(shape.id, { message: (e.target as HTMLInputElement).value })}
                        />
                    </div>
                </div>
            ))}

            <button class="tree-add-btn" onClick={createNewShape}>+ Add Rule</button>
        </div>
    );
}
