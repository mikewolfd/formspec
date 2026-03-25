/** @filedesc shadcn/React render adapter — React components styled with shadcn design tokens. */
import type { RenderAdapter } from 'formspec-webcomponent';
import { renderTextInput } from './text-input';
import { renderNumberInput } from './number-input';
import { renderRadioGroup } from './radio-group';
import { renderCheckboxGroup } from './checkbox-group';
import { renderSelect } from './select';
import { renderDatePicker } from './date-picker';
import { renderCheckbox } from './checkbox';
import { renderToggle } from './toggle';
import { renderMoneyInput } from './money-input';
import { renderSlider } from './slider';
import { renderRating } from './rating';
import { renderFileUpload } from './file-upload';
import { renderSignature } from './signature';
import { renderWizard } from './wizard';
import { renderTabs } from './tabs';

export { createReactAdapter } from './factory';
export { cn } from './cn';

/**
 * shadcn/ui render adapter for formspec-webcomponent.
 *
 * Each component is a React function component rendered via `createRoot` + `flushSync`,
 * styled with shadcn's Tailwind design token classes (border-input, bg-background, etc.).
 *
 * Requirements:
 * - `react` + `react-dom` >= 18
 * - Tailwind CSS with shadcn's CSS variable theme (or a compatible design token setup)
 *
 * Components own the DOM structure via JSX; `behavior.bind()` manages reactive updates.
 */
export const shadcnAdapter: RenderAdapter = {
    name: 'shadcn',
    components: {
        TextInput: renderTextInput,
        NumberInput: renderNumberInput,
        RadioGroup: renderRadioGroup,
        CheckboxGroup: renderCheckboxGroup,
        Select: renderSelect,
        DatePicker: renderDatePicker,
        Checkbox: renderCheckbox,
        Toggle: renderToggle,
        MoneyInput: renderMoneyInput,
        Slider: renderSlider,
        Rating: renderRating,
        FileUpload: renderFileUpload,
        Signature: renderSignature,
        Wizard: renderWizard,
        Tabs: renderTabs,
    },
};
