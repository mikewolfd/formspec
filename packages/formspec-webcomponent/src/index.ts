import { effect, signal } from '@preact/signals-core';
import { FormEngine } from 'formspec-engine';

export class FormspecRender extends HTMLElement {
    private _definition: any;
    private _componentDocument: any;
    private _themeDocument: any;
    private engine: FormEngine | null = null;
    private cleanupFns: Array<() => void> = [];

    set definition(val: any) {
        this._definition = val;
        this.engine = new FormEngine(val);
        this.render();
    }

    get definition() {
        return this._definition;
    }

    set componentDocument(val: any) {
        this._componentDocument = val;
        this.render();
    }

    get componentDocument() {
        return this._componentDocument;
    }

    set themeDocument(val: any) {
        this._themeDocument = val;
        this.render();
    }

    get themeDocument() {
        return this._themeDocument;
    }

    getEngine() {
        return this.engine;
    }

    private cleanup() {
        for (const fn of this.cleanupFns) {
            fn();
        }
        this.cleanupFns = [];
        this.innerHTML = '';
    }

    render() {
        this.cleanup();
        if (!this.engine || !this._definition) return;

        // Verify Component Document §2.1 & §2.2
        if (this._componentDocument) {
            if (this._componentDocument.$formspecComponent !== '1.0') {
                console.warn(`Unsupported Component Document version: ${this._componentDocument.$formspecComponent}`);
            }

            if (this._componentDocument.targetDefinition) {
                const target = this._componentDocument.targetDefinition;
                if (target.url !== this._definition.url) {
                    console.warn(`Component Document target URL (${target.url}) does not match Definition URL (${this._definition.url})`);
                }
            }
        }

        const container = document.createElement('div');
        container.className = 'formspec-container';

        if (this._componentDocument && this._componentDocument.tree) {
            this.renderComponent(this._componentDocument.tree, container);
        } else {
            for (const item of this._definition.items) {
                this.renderItem(item, container);
            }
        }

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.textContent = 'Submit';
        submitBtn.addEventListener('click', () => {
            const response = this.engine!.getResponse();
            this.dispatchEvent(new CustomEvent('formspec-submit', {
                detail: response,
                bubbles: true
            }));
        });
        container.appendChild(submitBtn);

        this.appendChild(container);
    }

    private findItemByKey(key: string, items: any[] = this._definition.items): any | null {
        for (const item of items) {
            if (item.key === key) return item;
            if (item.children) {
                const found = this.findItemByKey(key, item.children);
                if (found) return found;
            }
        }
        return null;
    }

    private resolveToken(val: any): any {
        if (typeof val === 'string' && val.startsWith('$token.')) {
            const tokenKey = val.substring(7);
            if (this._componentDocument?.tokens && this._componentDocument.tokens[tokenKey] !== undefined) {
                return this._componentDocument.tokens[tokenKey];
            }
            if (this._themeDocument?.tokens && this._themeDocument.tokens[tokenKey] !== undefined) {
                return this._themeDocument.tokens[tokenKey];
            }
        }
        return val;
    }

    private applyStyle(el: HTMLElement, style: any) {
        if (!style) return;
        for (const [key, val] of Object.entries(style)) {
            const resolved = this.resolveToken(val);
            (el.style as any)[key] = resolved;
        }
    }

    private renderDataTableCell(td: HTMLElement, fieldName: string) {
        const signal = this.engine!.signals[fieldName];
        if (signal) {
            this.cleanupFns.push(effect(() => {
                td.textContent = signal.value;
            }));
        }
    }

    private renderComponent(comp: any, parent: HTMLElement, prefix = '') {
        // Handle 'when' condition (§8)
        if (comp.when) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'contents';
            parent.appendChild(wrapper);
            const exprFn = this.engine!.compileExpression(comp.when, prefix);
            this.cleanupFns.push(effect(() => {
                const visible = !!exprFn();
                wrapper.style.display = visible ? 'contents' : 'none';
            }));
            parent = wrapper;
        }

        const componentType = comp.component;
        
        // Handle Repeatable Group Binding (§4.4)
        if (comp.bind) {
            const item = this.findItemByKey(comp.bind);
            if (item && item.type === 'group' && item.repeatable) {
                const fullName = prefix ? `${prefix}.${comp.bind}` : comp.bind;
                const container = document.createElement('div');
                container.className = `repeatable-container-${comp.bind}`;
                parent.appendChild(container);

                this.cleanupFns.push(effect(() => {
                    const count = this.engine!.repeats[fullName]?.value || 0;
                    // For simplicity in this implementation, we'll re-render when count changes
                    // but a more efficient way would be to only add/remove instances.
                    // Given the reactive nature, we'll try to be efficient.
                    while (container.children.length > count) {
                        container.removeChild(container.lastChild!);
                    }
                    while (container.children.length < count) {
                        const idx = container.children.length;
                        const instanceWrapper = document.createElement('div');
                        instanceWrapper.style.display = 'contents';
                        container.appendChild(instanceWrapper);
                        
                        // We need a separate function or closure to render the instance
                        // because prefix changes for each instance.
                        const instancePrefix = `${fullName}[${idx}]`;
                        this.renderActualComponent(comp, instanceWrapper, instancePrefix, true);
                    }
                }));
                return;
            }
        }

        this.renderActualComponent(comp, parent, prefix);
    }

    private renderActualComponent(comp: any, parent: HTMLElement, prefix = '', isRepeatInstance = false) {
        const componentType = comp.component;
        let el: HTMLElement | null = null;

        switch (componentType) {
            case 'Page': // §5.1
                el = document.createElement('section');
                el.className = 'formspec-page';
                if (comp.title) {
                    const h2 = document.createElement('h2');
                    h2.textContent = comp.title;
                    el.appendChild(h2);
                }
                if (comp.description) {
                    const p = document.createElement('p');
                    p.className = 'page-description';
                    p.textContent = comp.description;
                    el.appendChild(p);
                }
                break;

            case 'Stack': // §5.2
                el = document.createElement('div');
                el.className = 'formspec-stack';
                el.style.display = 'flex';
                el.style.flexDirection = comp.direction === 'horizontal' ? 'row' : 'column';
                el.style.gap = this.resolveToken(comp.gap) || '0';
                el.style.alignItems = comp.align || 'stretch';
                if (comp.wrap && comp.direction === 'horizontal') {
                    el.style.flexWrap = 'wrap';
                }
                break;

            case 'Grid': // §5.3
                el = document.createElement('div');
                el.className = 'formspec-grid';
                el.style.display = 'grid';
                const cols = comp.columns || 2;
                el.style.gridTemplateColumns = typeof cols === 'number' ? `repeat(${cols}, 1fr)` : this.resolveToken(cols);
                el.style.gap = this.resolveToken(comp.gap) || '0';
                if (comp.rowGap) {
                    el.style.rowGap = this.resolveToken(comp.rowGap);
                }
                break;

            case 'TextInput':
            case 'NumberInput':
            case 'DatePicker':
            case 'Select':
            case 'Toggle':
            case 'Checkbox':
            case 'CheckboxGroup':
            case 'RadioGroup':
                // All these are Input components (§5.6-§5.11)
                if (comp.bind) {
                    const item = this.findItemByKey(comp.bind);
                    if (item) {
                        const itemFullName = prefix ? `${prefix}.${comp.bind}` : comp.bind;
                        const fieldWrapper = this.renderInputComponent(comp, item, itemFullName);
                        parent.appendChild(fieldWrapper);
                        return;
                    }
                }
                break;

            case 'Heading': // §5.13
                el = document.createElement(`h${comp.level || 1}`);
                el.textContent = comp.text || '';
                break;

            case 'Text': // §5.14
                el = document.createElement('p');
                el.className = `text-variant-${comp.variant || 'body'}`;
                if (comp.bind) {
                    const itemFullName = prefix ? `${prefix}.${comp.bind}` : comp.bind;
                    this.cleanupFns.push(effect(() => {
                        const sig = this.engine!.signals[itemFullName];
                        el!.textContent = sig ? String(sig.value ?? '') : '';
                    }));
                } else {
                    el.textContent = comp.text || '';
                }
                break;

            case 'Card':
                el = document.createElement('div');
                el.className = 'formspec-card';
                el.style.border = '1px solid #ddd';
                el.style.borderRadius = this.resolveToken('$token.border.radius') || '8px';
                el.style.padding = this.resolveToken('$token.spacing.md') || '1rem';
                if (comp.title) {
                    const h3 = document.createElement('h3');
                    h3.textContent = comp.title;
                    el.appendChild(h3);
                }
                break;

            case 'Spacer':
                el = document.createElement('div');
                el.style.height = this.resolveToken(comp.size) || '1rem';
                break;

            case 'Alert':
                el = document.createElement('div');
                el.className = `formspec-alert alert-${comp.severity || 'info'}`;
                el.style.padding = '0.75rem 1.25rem';
                el.style.marginBottom = '1rem';
                el.style.border = '1px solid transparent';
                el.style.borderRadius = '0.25rem';
                if (comp.severity === 'error') {
                    el.style.color = '#721c24';
                    el.style.backgroundColor = '#f8d7da';
                    el.style.borderColor = '#f5c6cb';
                } else if (comp.severity === 'warning') {
                    el.style.color = '#856404';
                    el.style.backgroundColor = '#fff3cd';
                    el.style.borderColor = '#ffeeba';
                } else if (comp.severity === 'success') {
                    el.style.color = '#155724';
                    el.style.backgroundColor = '#d4edda';
                    el.style.borderColor = '#c3e6cb';
                } else {
                    el.style.color = '#0c5460';
                    el.style.backgroundColor = '#d1ecf1';
                    el.style.borderColor = '#bee5eb';
                }
                el.textContent = comp.text || '';
                break;

            case 'Badge':
                el = document.createElement('span');
                el.className = `formspec-badge badge-${comp.variant || 'default'}`;
                el.style.padding = '0.25em 0.4em';
                el.style.fontSize = '75%';
                el.style.fontWeight = '700';
                el.style.borderRadius = '0.25rem';
                el.style.backgroundColor = '#6c757d';
                el.style.color = '#fff';
                el.textContent = comp.text || '';
                break;

            case 'Wizard':
                el = document.createElement('div');
                el.className = 'formspec-wizard';
                const currentStep = signal(0);
                const wizardContent = document.createElement('div');
                el.appendChild(wizardContent);

                const nav = document.createElement('div');
                nav.style.marginTop = '1rem';
                const prevBtn = document.createElement('button');
                prevBtn.textContent = 'Previous';
                prevBtn.addEventListener('click', () => { if (currentStep.value > 0) currentStep.value--; });
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Next';
                nextBtn.addEventListener('click', () => { if (currentStep.value < (comp.children?.length || 1) - 1) currentStep.value++; });
                nav.appendChild(prevBtn);
                nav.appendChild(nextBtn);
                el.appendChild(nav);

                if (comp.children) {
                    comp.children.forEach((child: any, idx: number) => {
                        const stepContent = document.createElement('div');
                        stepContent.style.display = 'contents';
                        this.cleanupFns.push(effect(() => {
                            stepContent.style.display = currentStep.value === idx ? 'contents' : 'none';
                        }));
                        this.renderComponent(child, stepContent, prefix);
                        wizardContent.appendChild(stepContent);
                    });
                }
                this.cleanupFns.push(effect(() => {
                    prevBtn.disabled = currentStep.value === 0;
                    nextBtn.disabled = currentStep.value === (comp.children?.length || 1) - 1;
                }));
                this.applyStyle(el, comp.style);
                parent.appendChild(el);
                return;

            case 'Tabs':
                el = document.createElement('div');
                el.className = 'formspec-tabs';
                const tabList = document.createElement('div');
                tabList.style.display = 'flex';
                tabList.style.borderBottom = '1px solid #ccc';
                el.appendChild(tabList);
                const tabsContentArea = document.createElement('div');
                el.appendChild(tabsContentArea);

                const activeTab = signal(comp.defaultTab || 0);
                if (comp.children) {
                    comp.children.forEach((child: any, idx: number) => {
                        const btn = document.createElement('button');
                        btn.textContent = comp.tabLabels?.[idx] || child.title || `Tab ${idx + 1}`;
                        btn.style.padding = '0.5rem 1rem';
                        btn.style.border = 'none';
                        btn.style.background = 'none';
                        btn.style.cursor = 'pointer';
                        this.cleanupFns.push(effect(() => {
                            btn.style.borderBottom = activeTab.value === idx ? '2px solid blue' : 'none';
                            btn.style.fontWeight = activeTab.value === idx ? 'bold' : 'normal';
                        }));
                        btn.addEventListener('click', () => activeTab.value = idx);
                        tabList.appendChild(btn);

                        const tabContent = document.createElement('div');
                        this.cleanupFns.push(effect(() => {
                            tabContent.style.display = activeTab.value === idx ? 'block' : 'none';
                        }));
                        this.renderComponent(child, tabContent, prefix);
                        tabsContentArea.appendChild(tabContent);
                    });
                }
                this.applyStyle(el, comp.style);
                parent.appendChild(el);
                return;

            case 'ConditionalGroup':
                if (comp.children) {
                    for (const child of comp.children) {
                        this.renderComponent(child, parent, prefix);
                    }
                }
                return;

            case 'DataTable':
                this.renderDataTableComponent(comp, parent, prefix);
                return;

            default:
                console.warn(`Unknown component type: ${componentType}`);
                return;
        }

        if (el) {
            if (comp.id) el.id = comp.id;
            this.applyStyle(el, comp.style);
            parent.appendChild(el);
            if (comp.children) {
                for (const child of comp.children) {
                    this.renderComponent(child, el, prefix);
                }
            }
        }
    }

    private renderInputComponent(comp: any, item: any, fullName: string): HTMLElement {
        const dataType = item.dataType;
        const componentType = comp.component;

        // §4.6 Bind/dataType Compatibility Matrix
        const matrix: Record<string, string[]> = {
            'string': ['TextInput', 'Select', 'RadioGroup'],
            'decimal': ['NumberInput', 'Slider', 'Rating', 'TextInput'],
            'integer': ['NumberInput', 'Slider', 'Rating', 'TextInput'],
            'boolean': ['Toggle', 'Checkbox'],
            'date': ['DatePicker', 'TextInput'],
            'dateTime': ['DatePicker', 'TextInput'],
            'time': ['DatePicker', 'TextInput'],
            'choice': ['Select', 'RadioGroup', 'TextInput'],
            'multiChoice': ['CheckboxGroup'],
            'attachment': ['FileUpload', 'Signature'],
            'money': ['NumberInput', 'TextInput']
        };

        if (matrix[dataType] && !matrix[dataType].includes(componentType)) {
            console.warn(`Incompatible component ${componentType} for dataType ${dataType}.`);
        }

        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'form-field';
        fieldWrapper.dataset.name = fullName;

        const label = document.createElement('label');
        label.textContent = comp.labelOverride || item.label || item.key;
        fieldWrapper.appendChild(label);
        
        // §4.2.3 Required indicator
        this.cleanupFns.push(effect(() => {
            const isRequired = this.engine!.requiredSignals[fullName]?.value;
            if (isRequired) {
                label.innerHTML = `${comp.labelOverride || item.label || item.key} <span class="required-indicator" style="color: red">*</span>`;
            } else {
                label.textContent = comp.labelOverride || item.label || item.key;
            }
        }));

        if (item.hint || comp.hintOverride) {
            const hint = document.createElement('div');
            hint.className = 'field-hint';
            hint.textContent = comp.hintOverride || item.hint;
            hint.style.fontSize = '0.8rem';
            hint.style.color = '#666';
            fieldWrapper.appendChild(hint);
        }

        let input: HTMLElement;

        if (componentType === 'Select' || (dataType === 'choice' && componentType === 'TextInput')) {
             const select = document.createElement('select');
             select.name = fullName;
             if (item.options) {
                 for (const opt of item.options) {
                     const option = document.createElement('option');
                     option.value = opt.value;
                     option.textContent = opt.label;
                     select.appendChild(option);
                 }
             }
             input = select;
        } else if (componentType === 'Toggle' || componentType === 'Checkbox' || dataType === 'boolean') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = fullName;
            input = checkbox;
        } else {
            const htmlInput = document.createElement('input');
            htmlInput.name = fullName;
            if (componentType === 'NumberInput' || ['integer', 'decimal', 'money'].includes(dataType)) {
                htmlInput.type = 'number';
            } else if (componentType === 'DatePicker' || ['date', 'dateTime', 'time'].includes(dataType)) {
                htmlInput.type = dataType === 'date' ? 'date' : (dataType === 'time' ? 'time' : 'datetime-local');
            } else {
                htmlInput.type = 'text';
            }
            
            // Apply TextInput specific props (§5.6)
            if (componentType === 'TextInput') {
                if (comp.placeholder) htmlInput.placeholder = comp.placeholder;
                if (comp.inputMode) htmlInput.inputMode = comp.inputMode;
                if (comp.maxLines && comp.maxLines > 1) {
                    const textarea = document.createElement('textarea');
                    textarea.name = fullName;
                    textarea.rows = comp.maxLines;
                    if (comp.placeholder) textarea.placeholder = comp.placeholder;
                    input = textarea;
                } else {
                    input = htmlInput;
                }
            } else {
                input = htmlInput;
            }
        }

        fieldWrapper.appendChild(input);
        if (comp.id) input.id = comp.id;

        const errorDisplay = document.createElement('div');
        errorDisplay.className = 'error-message';
        errorDisplay.style.color = 'red';
        errorDisplay.style.fontSize = '0.8rem';
        fieldWrapper.appendChild(errorDisplay);

        // Bind events
        input.addEventListener('input', (e) => {
            const target = e.target as any;
            let val: any;
            if (dataType === 'boolean') {
                val = target.checked;
            } else if (['integer', 'decimal', 'money'].includes(dataType)) {
                val = target.value === '' ? null : Number(target.value);
            } else {
                val = target.value;
            }
            this.engine!.setValue(fullName, val);
        });

        // Reactively bind value
        this.cleanupFns.push(effect(() => {
            const sig = this.engine!.signals[fullName];
            if (!sig) return;
            const val = sig.value;
            if (dataType === 'boolean') {
                if (document.activeElement !== input) (input as HTMLInputElement).checked = !!val;
            } else {
                if (document.activeElement !== input) (input as HTMLInputElement).value = val ?? '';
            }
        }));

        // Relevancy, Readonly, Error signals (§4.2)
        this.cleanupFns.push(effect(() => {
            const isRelevant = this.engine!.relevantSignals[fullName]?.value ?? true;
            fieldWrapper.style.display = isRelevant ? 'block' : 'none';
        }));

        this.cleanupFns.push(effect(() => {
            const isReadonly = this.engine!.readonlySignals[fullName]?.value ?? false;
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) (input as any).readOnly = isReadonly;
            else (input as any).disabled = isReadonly;
        }));

        this.cleanupFns.push(effect(() => {
            const error = this.engine!.errorSignals[fullName]?.value;
            errorDisplay.textContent = error || '';
        }));

        this.applyStyle(fieldWrapper, comp.style);
        return fieldWrapper;
    }

    private renderDataTableComponent(comp: any, parent: HTMLElement, prefix = '') {
        const el = document.createElement('div');
        el.className = 'formspec-datatable';
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        if (comp.columns) {
            for (const col of comp.columns) {
                const th = document.createElement('th');
                th.textContent = col.header;
                tr.appendChild(th);
            }
        }
        thead.appendChild(tr);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        const fullName = prefix ? `${prefix}.${comp.bind}` : comp.bind;
        this.cleanupFns.push(effect(() => {
            const count = this.engine!.repeats[fullName]?.value || 0;
            tbody.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const row = document.createElement('tr');
                if (comp.columns) {
                    for (const col of comp.columns) {
                        const td = document.createElement('td');
                        const fieldName = `${fullName}[${i}].${col.bind}`;
                        this.renderDataTableCell(td, fieldName);
                        row.appendChild(td);
                    }
                }
                tbody.appendChild(row);
            }
        }));
        el.appendChild(table);
        parent.appendChild(el);
    }

    private renderItem(item: any, parent: HTMLElement, prefix = '') {
        const key = item.key;
        const fullName = prefix ? `${prefix}.${key}` : key;

        if (item.type === 'group' && item.repeatable) {
            this.renderComponent({
                component: 'Stack',
                bind: key,
                children: item.children?.map((c: any) => ({ component: this.getDefaultComponent(c), bind: c.key }))
            }, parent, prefix);
        } else if (item.type === 'group') {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'group';
            const title = document.createElement('h3');
            title.textContent = item.label || key;
            groupWrapper.appendChild(title);
            if (item.children) {
                for (const child of item.children) {
                    this.renderItem(child, groupWrapper, fullName);
                }
            }
            parent.appendChild(groupWrapper);
        } else if (item.type === 'field') {
            const comp = {
                component: this.getDefaultComponent(item),
                bind: key
            };
            const fieldWrapper = this.renderInputComponent(comp, item, fullName);
            parent.appendChild(fieldWrapper);
        } else if (item.type === 'display') {
            const el = document.createElement('p');
            el.textContent = item.label || '';
            parent.appendChild(el);
            if (this.engine!.relevantSignals[fullName]) {
                this.cleanupFns.push(effect(() => {
                    const isRelevant = this.engine!.relevantSignals[fullName].value;
                    el.style.display = isRelevant ? 'block' : 'none';
                }));
            }
        }
    }

    private getDefaultComponent(item: any): string {
        const dataType = item.dataType;
        switch (dataType) {
            case 'string': return 'TextInput';
            case 'integer':
            case 'decimal': return 'NumberInput';
            case 'boolean': return 'Toggle';
            case 'date': return 'DatePicker';
            case 'choice': return 'Select';
            case 'multiChoice': return 'CheckboxGroup';
            default: return 'TextInput';
        }
    }
}
