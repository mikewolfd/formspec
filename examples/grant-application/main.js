import 'formspec-webcomponent/formspec-base.css';
import { effect } from '@preact/signals-core';
import { FormspecRender, formatMoney } from 'formspec-webcomponent';
customElements.define('formspec-render', FormspecRender);

const SERVER = 'http://localhost:8000';

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

const formEl = document.getElementById('form');
const btnSubmit = document.getElementById('btn-submit');
const btnBackScreener = document.getElementById('btn-back-screener');
const serverResponseEl = document.getElementById('server-response');
const serverResponsePre = document.getElementById('server-response-pre');
const validationPanelEl = document.getElementById('validation-panel');
const validationPanelSummaryEl = document.getElementById('validation-panel-summary');
const validationPanelListEl = document.getElementById('validation-panel-list');
const footerGrandTotal = document.getElementById('footer-grand-total');
const footerRequested = document.getElementById('footer-requested');
const footerMatch = document.getElementById('footer-match');

// Load all artifacts in parallel
const [definition, componentDoc, themeDoc] = await Promise.all([
  loadJSON('./definition.json'),
  loadJSON('./component.json'),
  loadJSON('./theme.json'),
]);

formEl.definition = definition;
formEl.componentDocument = componentDoc;
formEl.themeDocument = themeDoc;

const engine = formEl.getEngine();

// ── Reactive footer totals ──
effect(() => {
  engine.structureVersion.value;

  const gt = engine.variableSignals['#:grandTotal']?.value;
  const rq = engine.signals['budget.requestedAmount']?.value;

  footerGrandTotal.textContent = formatMoney(gt) || '—';
  footerRequested.textContent  = formatMoney(rq) || '—';

  if (gt && rq && gt.amount != null && rq.amount != null) {
    const diff = Math.abs(parseFloat(gt.amount) - parseFloat(rq.amount));
    if (diff < 1) {
      footerMatch.textContent = '✓ Amounts match';
      footerMatch.className = 'totals-match ok';
    } else {
      footerMatch.textContent = `⚠ Difference: ${formatMoney({ amount: diff })}`;
      footerMatch.className = 'totals-match mismatch';
    }
  } else {
    footerMatch.textContent = '';
  }
});

// ── Wizard page tracking (via formspec-page-change event) ──
const progressStepEls = Array.from(document.querySelectorAll('#progress-steps li'));
const progressScreenerEl = document.querySelector('#progress-steps li[data-step="screener"]');
const progressFormStepEls = progressStepEls.filter(li => !li.hasAttribute('data-step'));
const submitAreaEl = document.querySelector('.submit-area');
const backScreenerAreaEl = document.querySelector('.back-screener-area');
const PAGE_TITLES = progressFormStepEls.map(li => li.getAttribute('data-page'));
let screenerCompleted = false;
let currentFormPageIndex = -1;

function hideValidationPanel() {
  validationPanelEl?.classList.remove('visible');
  if (validationPanelListEl) validationPanelListEl.innerHTML = '';
  if (validationPanelSummaryEl) validationPanelSummaryEl.textContent = '';
}

function normalizePath(path) {
  return typeof path === 'string' ? path.trim() : '';
}

function findFieldElement(path) {
  if (!path || path === '#') return null;
  const escapedPath = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(path) : path;
  let fieldEl = formEl.querySelector(`.formspec-field[data-name="${escapedPath}"]`);
  if (fieldEl) return fieldEl;
  const allFields = Array.from(formEl.querySelectorAll('.formspec-field[data-name]'));
  fieldEl = allFields.find((el) => {
    const name = el.getAttribute('data-name');
    return name === path || name?.startsWith(`${path}.`) || name?.startsWith(`${path}[`);
  });
  return fieldEl || null;
}

function resolveValidationTarget(result) {
  const path = normalizePath(result?.sourceId || result?.path);
  const fieldEl = findFieldElement(path);
  const labelText = fieldEl?.querySelector('.formspec-label')?.textContent?.trim()
    || (path && path !== '#' ? path : 'Application-level validation');
  return { path, fieldEl, labelText };
}

function navigateToWizardPage(targetPageIndex) {
  if (targetPageIndex < 0 || currentFormPageIndex < 0 || currentFormPageIndex === targetPageIndex) return;
  const maxHops = Math.max(PAGE_TITLES.length * 2, 8);
  let hops = 0;

  while (currentFormPageIndex < targetPageIndex && hops < maxHops) {
    const nextBtn = formEl.querySelector('button.formspec-wizard-next');
    if (!nextBtn) break;
    nextBtn.click();
    hops += 1;
  }
  while (currentFormPageIndex > targetPageIndex && hops < maxHops) {
    const prevBtn = formEl.querySelector('button.formspec-wizard-prev');
    if (!prevBtn) break;
    prevBtn.click();
    hops += 1;
  }
}

function revealTabsForField(fieldEl) {
  let tabPanel = fieldEl.closest('.formspec-tab-panel');
  while (tabPanel) {
    if (tabPanel.classList.contains('formspec-hidden')) {
      const tabsRoot = tabPanel.closest('.formspec-tabs');
      if (tabsRoot) {
        const panels = Array.from(tabsRoot.querySelectorAll('.formspec-tab-panel'));
        const panelIdx = panels.indexOf(tabPanel);
        const tabButtons = tabsRoot.querySelectorAll('.formspec-tab-bar .formspec-tab');
        const tabBtn = tabButtons[panelIdx];
        if (tabBtn instanceof HTMLButtonElement) tabBtn.click();
      }
    }
    tabPanel = tabPanel.parentElement?.closest('.formspec-tab-panel') || null;
  }
}

function focusValidationTarget(path) {
  const normalizedPath = normalizePath(path);
  const fieldEl = findFieldElement(normalizedPath);
  if (!fieldEl) return;

  const panels = Array.from(formEl.querySelectorAll('.formspec-wizard-panel'));
  const targetPanelIndex = panels.findIndex((panel) => panel.contains(fieldEl));
  if (targetPanelIndex >= 0) {
    navigateToWizardPage(targetPanelIndex);
  }

  // Re-resolve after page navigation in case the form re-rendered.
  const targetField = findFieldElement(normalizedPath);
  if (!targetField) return;

  const collapsible = targetField.closest('details.formspec-collapsible');
  if (collapsible) collapsible.open = true;
  revealTabsForField(targetField);

  const inputEl = targetField.querySelector('input, select, textarea, button, [tabindex]');
  targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (inputEl instanceof HTMLElement) {
    inputEl.focus({ preventScroll: true });
  }
}

function renderValidationPanel(report) {
  if (!validationPanelEl || !validationPanelSummaryEl || !validationPanelListEl) return;
  const errorResults = report.results.filter((result) => (result?.severity || 'error') === 'error');
  if (errorResults.length === 0) {
    hideValidationPanel();
    return;
  }

  const seen = new Set();
  const uniqueErrors = [];
  for (const result of errorResults) {
    const key = `${result?.sourceId || result?.path || '#'}|${result?.message || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueErrors.push(result);
  }

  validationPanelSummaryEl.textContent = `${uniqueErrors.length} issue${uniqueErrors.length === 1 ? '' : 's'} must be corrected.`;
  validationPanelListEl.innerHTML = '';

  for (const result of uniqueErrors) {
    const { path, fieldEl, labelText } = resolveValidationTarget(result);
    const li = document.createElement('li');
    const message = result?.message || 'Validation error';

    if (fieldEl && path && path !== '#') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'validation-jump';
      btn.dataset.path = path;
      btn.textContent = `${labelText}: ${message}`;
      li.appendChild(btn);
    } else {
      li.textContent = `${labelText}: ${message}`;
    }

    validationPanelListEl.appendChild(li);
  }

  validationPanelEl.classList.add('visible');
  validationPanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProgress() {
  progressStepEls.forEach((li) => {
    li.classList.remove('active', 'valid', 'invalid');
  });

  if (!screenerCompleted) {
    progressScreenerEl?.classList.add('active');
    return;
  }

  progressScreenerEl?.classList.add('valid');
  progressFormStepEls.forEach((li, i) => {
    li.classList.toggle('active', i === currentFormPageIndex);
    li.classList.toggle('valid', i < currentFormPageIndex);
  });
}

renderProgress();

formEl.addEventListener('formspec-page-change', (e) => {
  const { index, total, title } = e.detail;
  const isLastPage = index === total - 1;
  const isFirstPage = index === 0;
  const currentIdx = PAGE_TITLES.indexOf(title);
  currentFormPageIndex = currentIdx;
  screenerCompleted = true;
  renderProgress();

  const wizardNav = formEl.querySelector('.formspec-wizard-nav');
  const wizardNextBtn = formEl.querySelector('button.formspec-wizard-next');

  if (isLastPage && wizardNav) {
    // Move submit button into the wizard nav row, hide the Next/Finish button
    if (wizardNextBtn) wizardNextBtn.style.display = 'none';
    wizardNav.appendChild(btnSubmit);
    btnSubmit.style.display = '';
  } else {
    // Move submit button back out, restore Next button
    if (wizardNextBtn) wizardNextBtn.style.display = '';
    submitAreaEl.appendChild(btnSubmit);
    btnSubmit.style.display = 'none';
  }

  if (isFirstPage && screenerCompleted && wizardNav) {
    btnBackScreener.style.display = '';
    wizardNav.insertBefore(btnBackScreener, wizardNav.firstChild);
  } else {
    backScreenerAreaEl.appendChild(btnBackScreener);
    btnBackScreener.style.display = 'none';
  }
});

formEl.addEventListener('formspec-screener-route', (e) => {
  const { route } = e.detail;
  const defUrl = definition.url;
  const isInternal = route && (route.target === defUrl || route.target.startsWith(defUrl + '/') || route.target.split('|')[0] === defUrl);

  if (!isInternal && route) {
    // External route — show a redirect notice instead of the form
    const notice = document.createElement('div');
    notice.className = 'formspec-screener';
    notice.innerHTML = `
      <h2 class="formspec-screener-heading">You're being redirected</h2>
      <p class="formspec-screener-intro">Based on your answers, the appropriate form is:</p>
      <p style="font-weight:600; color: var(--color-primary)">${route.label || route.target}</p>
      <p class="formspec-screener-intro" style="font-size:14px; color: var(--color-neutral-700)">In a production system this would navigate to the correct form automatically.</p>
    `;
    const formArea = formEl.closest('.form-area');
    formArea.querySelector('.formspec-screener-redirect')?.remove();
    notice.classList.add('formspec-screener-redirect');
    formEl.after(notice);
    return;
  }

  screenerCompleted = true;
  currentFormPageIndex = 0;
  renderProgress();
});

progressScreenerEl?.addEventListener('click', () => {
  if (!screenerCompleted) return;
  if (typeof formEl.restartScreener === 'function') {
    formEl.restartScreener();
  }
  screenerCompleted = false;
  currentFormPageIndex = -1;
  renderProgress();
  submitAreaEl.appendChild(btnSubmit);
  btnSubmit.style.display = 'none';
  backScreenerAreaEl.appendChild(btnBackScreener);
  btnBackScreener.style.display = 'none';
  hideValidationPanel();
});

btnBackScreener.addEventListener('click', () => {
  if (typeof formEl.restartScreener === 'function') {
    formEl.restartScreener();
  }
  screenerCompleted = false;
  currentFormPageIndex = -1;
  renderProgress();
  submitAreaEl.appendChild(btnSubmit);
  btnSubmit.style.display = 'none';
  backScreenerAreaEl.appendChild(btnBackScreener);
  btnBackScreener.style.display = 'none';
  hideValidationPanel();
});

validationPanelListEl?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const jumpBtn = target.closest('button.validation-jump');
  if (!(jumpBtn instanceof HTMLButtonElement)) return;
  const { path } = jumpBtn.dataset;
  if (path) {
    focusValidationTarget(path);
  }
});

// ── Submit ──
btnSubmit.addEventListener('click', async () => {
  // Trigger built-in submit flow once so all fields become touched and inline errors are visible.
  const internalSubmitBtn = formEl.querySelector('button.formspec-submit');
  if (internalSubmitBtn instanceof HTMLButtonElement) {
    internalSubmitBtn.click();
  }

  const report = engine.getValidationReport({ mode: 'submit' });
  if (!report.valid) {
    renderValidationPanel(report);
    return;
  }
  hideValidationPanel();

  const response = engine.getResponse({ mode: 'submit' });
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Submitting…';

  try {
    const res = await fetch(`${SERVER}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    const result = await res.json();
    serverResponsePre.textContent = JSON.stringify(result, null, 2);
    serverResponseEl.classList.add('visible');
    serverResponseEl.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    serverResponsePre.textContent = `Error contacting server: ${e.message}\n\nMake sure the server is running:\n  cd examples/grant-application\n  pip install -r server/requirements.txt\n  PYTHONPATH=../../src uvicorn server.main:app --port 8000`;
    serverResponseEl.classList.add('visible');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Submit Application';
  }
});
