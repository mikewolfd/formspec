/** @filedesc Structural DOM tests for all 15 USWDS adapter components. */
import { describe, it, expect, beforeAll } from 'vitest';
import { renderTextInput } from '../../src/uswds/text-input';
import { renderNumberInput } from '../../src/uswds/number-input';
import { renderRadioGroup } from '../../src/uswds/radio-group';
import { renderCheckboxGroup } from '../../src/uswds/checkbox-group';
import { renderSelect } from '../../src/uswds/select';
import { renderDatePicker } from '../../src/uswds/date-picker';
import { renderCheckbox } from '../../src/uswds/checkbox';
import { renderToggle } from '../../src/uswds/toggle';
import { renderMoneyInput } from '../../src/uswds/money-input';
import { renderSlider } from '../../src/uswds/slider';
import { renderRating } from '../../src/uswds/rating';
import { renderFileUpload } from '../../src/uswds/file-upload';
import { renderSignature } from '../../src/uswds/signature';
import { renderWizard } from '../../src/uswds/wizard';
import { renderTabs } from '../../src/uswds/tabs';
import {
    mockTextInput, mockNumberInput, mockRadioGroup, mockCheckboxGroup,
    mockSelect, mockDatePicker, mockFieldBehavior, mockToggle,
    mockMoneyInput, mockSlider, mockRating, mockFileUpload,
    mockSignature, mockWizard, mockTabs, mockAdapterContext, captureBindRefs,
    mockCanvasContext,
} from '../helpers';

beforeAll(() => { mockCanvasContext(); });

// ── Helpers ────────────────────────────────────────────────────────

function makeParent(): HTMLElement { return document.createElement('div'); }

// ── TextInput ──────────────────────────────────────────────────────

describe('USWDS TextInput', () => {
    it('renders usa-form-group with usa-input', () => {
        const parent = makeParent();
        const b = mockTextInput();
        renderTextInput(b, parent, mockAdapterContext());

        const root = parent.querySelector('.usa-form-group')!;
        expect(root).toBeTruthy();
        expect(root.querySelector('.usa-label')).toBeTruthy();
        expect(root.querySelector('.usa-input')).toBeTruthy();
        expect(root.querySelector('.usa-error-message')).toBeTruthy();
    });

    it('renders usa-textarea when maxLines > 1', () => {
        const parent = makeParent();
        renderTextInput(mockTextInput({ maxLines: 5 }), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-textarea')).toBeTruthy();
        expect(parent.querySelector('.usa-input')).toBeNull();
    });

    it('renders prefix/suffix with usa-input-group', () => {
        const parent = makeParent();
        renderTextInput(mockTextInput({ prefix: '$', suffix: '.00' }), parent, mockAdapterContext());
        const group = parent.querySelector('.usa-input-group')!;
        expect(group).toBeTruthy();
        expect(group.querySelector('.usa-input-prefix')!.textContent).toBe('$');
        expect(group.querySelector('.usa-input-suffix')!.textContent).toBe('.00');
    });

    it('hides label with usa-sr-only when labelPosition is hidden', () => {
        const parent = makeParent();
        renderTextInput(
            mockTextInput({ presentation: { labelPosition: 'hidden' } as any }),
            parent, mockAdapterContext()
        );
        const label = parent.querySelector('.usa-label')!;
        expect(label.classList.contains('usa-sr-only')).toBe(true);
    });

    it('calls bind() and registers dispose', () => {
        const parent = makeParent();
        const actx = mockAdapterContext();
        const b = mockTextInput();
        renderTextInput(b, parent, actx);
        expect(b.bind).toHaveBeenCalledOnce();
        expect(actx.onDispose).toHaveBeenCalled();
    });
});

// ── NumberInput ────────────────────────────────────────────────────

describe('USWDS NumberInput', () => {
    it('renders usa-input with type=number', () => {
        const parent = makeParent();
        renderNumberInput(mockNumberInput({ min: 0, max: 120, step: 1 }), parent, mockAdapterContext());
        const input = parent.querySelector('input.usa-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.type).toBe('number');
        expect(input.min).toBe('0');
        expect(input.max).toBe('120');
    });
});

// ── RadioGroup ─────────────────────────────────────────────────────

describe('USWDS RadioGroup', () => {
    it('renders usa-fieldset with usa-radio options', () => {
        const parent = makeParent();
        renderRadioGroup(mockRadioGroup(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-fieldset')).toBeTruthy();
        expect(parent.querySelector('.usa-legend')).toBeTruthy();
        const radios = parent.querySelectorAll('.usa-radio__input');
        expect(radios.length).toBe(2);
    });

    it('passes optionControls and rebuildOptions to bind()', () => {
        const parent = makeParent();
        const b = mockRadioGroup();
        renderRadioGroup(b, parent, mockAdapterContext());
        const refs = captureBindRefs(b);
        expect(refs.optionControls).toBeTruthy();
        expect(refs.optionControls!.size).toBe(2);
        expect(typeof refs.rebuildOptions).toBe('function');
    });
});

// ── CheckboxGroup ──────────────────────────────────────────────────

describe('USWDS CheckboxGroup', () => {
    it('renders usa-fieldset with usa-checkbox options', () => {
        const parent = makeParent();
        renderCheckboxGroup(mockCheckboxGroup(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-fieldset')).toBeTruthy();
        const checkboxes = parent.querySelectorAll('.usa-checkbox__input');
        expect(checkboxes.length).toBe(2);
    });

    it('renders select-all checkbox when selectAll is true', () => {
        const parent = makeParent();
        renderCheckboxGroup(mockCheckboxGroup({ selectAll: true }), parent, mockAdapterContext());
        // 2 options + 1 select-all = 3 checkbox inputs
        const checkboxes = parent.querySelectorAll('.usa-checkbox__input');
        expect(checkboxes.length).toBe(3);
    });
});

// ── Select ─────────────────────────────────────────────────────────

describe('USWDS Select', () => {
    it('renders usa-select with options', () => {
        const parent = makeParent();
        renderSelect(mockSelect(), parent, mockAdapterContext());
        const select = parent.querySelector('select.usa-select') as HTMLSelectElement;
        expect(select).toBeTruthy();
        // placeholder + 2 options = 3
        expect(select.options.length).toBe(3);
    });
});

// ── DatePicker ─────────────────────────────────────────────────────

describe('USWDS DatePicker', () => {
    it('renders usa-input with type=date', () => {
        const parent = makeParent();
        renderDatePicker(mockDatePicker(), parent, mockAdapterContext());
        const input = parent.querySelector('input.usa-input') as HTMLInputElement;
        expect(input).toBeTruthy();
        expect(input.type).toBe('date');
    });
});

// ── Checkbox ───────────────────────────────────────────────────────

describe('USWDS Checkbox', () => {
    it('renders usa-checkbox with input and label', () => {
        const parent = makeParent();
        renderCheckbox(mockFieldBehavior(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-checkbox')).toBeTruthy();
        expect(parent.querySelector('.usa-checkbox__input')).toBeTruthy();
        expect(parent.querySelector('.usa-checkbox__label')).toBeTruthy();
    });
});

// ── Toggle ─────────────────────────────────────────────────────────

describe('USWDS Toggle', () => {
    it('renders usa-checkbox (USWDS has no toggle)', () => {
        const parent = makeParent();
        renderToggle(mockToggle(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-checkbox')).toBeTruthy();
        expect(parent.querySelector('.usa-checkbox__input')).toBeTruthy();
    });
});

// ── MoneyInput ─────────────────────────────────────────────────────

describe('USWDS MoneyInput', () => {
    it('renders usa-input-group with currency prefix', () => {
        const parent = makeParent();
        renderMoneyInput(mockMoneyInput(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-input-group')).toBeTruthy();
        expect(parent.querySelector('.usa-input-prefix')!.textContent).toBe('$');
    });

    it('renders currency input when no resolvedCurrency', () => {
        const parent = makeParent();
        renderMoneyInput(mockMoneyInput({ resolvedCurrency: null }), parent, mockAdapterContext());
        expect(parent.querySelector('.formspec-money-currency-input')).toBeTruthy();
    });
});

// ── Slider ─────────────────────────────────────────────────────────

describe('USWDS Slider', () => {
    it('renders usa-range input', () => {
        const parent = makeParent();
        renderSlider(mockSlider(), parent, mockAdapterContext());
        expect(parent.querySelector('input.usa-range')).toBeTruthy();
    });
});

// ── Rating ─────────────────────────────────────────────────────────

describe('USWDS Rating', () => {
    it('renders 5 star spans', () => {
        const parent = makeParent();
        renderRating(mockRating(), parent, mockAdapterContext());
        expect(parent.querySelectorAll('.formspec-rating-star').length).toBe(5);
    });
});

// ── FileUpload ─────────────────────────────────────────────────────

describe('USWDS FileUpload', () => {
    it('renders usa-file-input structure', () => {
        const parent = makeParent();
        renderFileUpload(mockFileUpload(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-file-input')).toBeTruthy();
        expect(parent.querySelector('.usa-file-input__target')).toBeTruthy();
        expect(parent.querySelector('.usa-file-input__input')).toBeTruthy();
    });
});

// ── Signature ──────────────────────────────────────────────────────

describe('USWDS Signature', () => {
    it('renders canvas and clear button', () => {
        const parent = makeParent();
        renderSignature(mockSignature(), parent, mockAdapterContext());
        expect(parent.querySelector('canvas.formspec-signature-canvas')).toBeTruthy();
        expect(parent.querySelector('.usa-button.usa-button--outline')).toBeTruthy();
    });
});

// ── Wizard ──────────────────────────────────────────────────────────

describe('USWDS Wizard', () => {
    it('renders usa-step-indicator when showProgress is true', () => {
        const parent = makeParent();
        renderWizard(mockWizard(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-step-indicator')).toBeTruthy();
        expect(parent.querySelectorAll('.usa-step-indicator__segment').length).toBe(2);
    });
});

// ── Tabs ────────────────────────────────────────────────────────────

describe('USWDS Tabs', () => {
    it('renders usa-button-group--segmented tab bar', () => {
        const parent = makeParent();
        renderTabs(mockTabs(), parent, mockAdapterContext());
        expect(parent.querySelector('.usa-button-group--segmented')).toBeTruthy();
        const buttons = parent.querySelectorAll('[role="tab"]');
        expect(buttons.length).toBe(2);
    });
});

// ── Cascade obligations ────────────────────────────────────────────

describe('Cascade obligations', () => {
    it('applies cssClass from presentation to root', () => {
        const parent = makeParent();
        const b = mockTextInput({ presentation: { cssClass: 'custom-theme-class' } as any });
        renderTextInput(b, parent, mockAdapterContext());
        const root = parent.querySelector('.usa-form-group')!;
        expect(root.classList.contains('custom-theme-class')).toBe(true);
    });

    it('applies accessibility from presentation to root', () => {
        const parent = makeParent();
        const b = mockTextInput({
            presentation: {
                accessibility: { role: 'region', description: 'Important field' }
            } as any,
        });
        renderTextInput(b, parent, mockAdapterContext());
        const root = parent.querySelector('.usa-form-group')!;
        expect(root.getAttribute('role')).toBe('region');
        expect(root.getAttribute('aria-description')).toBe('Important field');
    });
});
