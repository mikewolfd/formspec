/** @filedesc USWDS Page layout — `usa-section` + `grid-container` + `usa-prose` for body content. */
import type { AdapterContext, PageLayoutBehavior } from '@formspec-org/webcomponent';

export function renderUSWDSPage(behavior: PageLayoutBehavior, parent: HTMLElement, actx: AdapterContext): void {
    const { comp, host, titleText, headingLevel, descriptionText } = behavior;

    // Page-mode containers (wizard / tabs) already provide the panel shell, heading, and spacing.
    // Rendering a full Page inside them duplicates titles and narrows the content unexpectedly.
    if (parent.classList.contains('formspec-wizard-panel') || parent.classList.contains('formspec-tab-panel')) {
        for (const child of comp.children || []) {
            host.renderComponent(child, parent, host.prefix);
        }
        return;
    }

    const section = document.createElement('section');
    if (comp.id) section.id = comp.id;
    section.className = 'usa-section formspec-page';
    actx.applyCssClass(section, comp);
    actx.applyAccessibility(section, comp);
    actx.applyStyle(section, comp.style);

    const container = document.createElement('div');
    container.className = 'grid-container';

    const prose = document.createElement('div');
    prose.className = 'usa-prose';

    if (titleText) {
        const h = document.createElement(headingLevel);
        h.textContent = titleText;
        prose.appendChild(h);
    }
    if (descriptionText) {
        const p = document.createElement('p');
        p.className = 'formspec-page-description';
        p.textContent = descriptionText;
        prose.appendChild(p);
    }

    for (const child of comp.children || []) {
        host.renderComponent(child, prose, host.prefix);
    }

    container.appendChild(prose);
    section.appendChild(container);
    parent.appendChild(section);
}
