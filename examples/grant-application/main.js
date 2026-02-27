import 'formspec-webcomponent/formspec-base.css';
import { effect } from '@preact/signals-core';
import { FormspecRender } from 'formspec-webcomponent';
customElements.define('formspec-render', FormspecRender);

const SERVER = 'http://localhost:8000';

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function formatMoney(moneyVal) {
  if (!moneyVal || moneyVal.amount == null) return '—';
  const n = parseFloat(moneyVal.amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: moneyVal.currency || 'USD' }).format(n);
}

const formEl = document.getElementById('form');
const btnSubmit = document.getElementById('btn-submit');
const shapeErrorsEl = document.getElementById('shape-errors');
const serverResponseEl = document.getElementById('server-response');
const serverResponsePre = document.getElementById('server-response-pre');
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
  // Touch structureVersion to re-run on structural changes
  engine.structureVersion.value;

  const grandTotalSignal = engine.variableSignals['#:grandTotal'];
  const requestedSignal  = engine.signals['budget.requestedAmount'];

  const gt = grandTotalSignal?.value;
  const rq = requestedSignal?.value;

  footerGrandTotal.textContent = formatMoney(gt);
  footerRequested.textContent  = formatMoney(rq);

  if (gt && rq && gt.amount != null && rq.amount != null) {
    const diff = Math.abs(parseFloat(gt.amount) - parseFloat(rq.amount));
    if (diff < 1) {
      footerMatch.textContent = '✓ Amounts match';
      footerMatch.className = 'totals-match ok';
    } else {
      footerMatch.textContent = `⚠ Difference: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(diff)}`;
      footerMatch.className = 'totals-match mismatch';
    }
  } else {
    footerMatch.textContent = '';
  }
});

// ── Wizard page tracking ──
const progressStepEls = Array.from(document.querySelectorAll('#progress-steps li'));
const submitAreaEl = document.querySelector('.submit-area');
const PAGE_TITLES = progressStepEls.map(li => li.getAttribute('data-page'));
const LAST_PAGE = PAGE_TITLES[PAGE_TITLES.length - 1];

function getCurrentPageTitle() {
  const panel = formEl.querySelector('.formspec-wizard-panel:not(.formspec-hidden)');
  return panel?.querySelector('h2')?.textContent?.trim() ?? '';
}

function updateWizardUI() {
  const current = getCurrentPageTitle();
  const currentIdx = PAGE_TITLES.indexOf(current);
  const isLastPage = current === LAST_PAGE;

  progressStepEls.forEach((li, i) => {
    li.classList.toggle('active', i === currentIdx);
    li.classList.toggle('valid', i < currentIdx);
    li.classList.toggle('invalid', false);
  });

  // Show our submit button only on last page
  submitAreaEl.style.display = isLastPage ? '' : 'none';

  // Hide the wizard's "Finish" nav button on last page — our Submit button handles it
  const wizardNextBtn = formEl.querySelector('button.formspec-wizard-next');
  if (wizardNextBtn) wizardNextBtn.style.display = isLastPage ? 'none' : '';
}

new MutationObserver(updateWizardUI).observe(formEl, { subtree: true, attributeFilter: ['class'] });
requestAnimationFrame(updateWizardUI);

// ── Shape error display ──
function refreshShapeErrors(mode = 'continuous') {
  const report = engine.getValidationReport({ mode });
  const shapeResults = report.results.filter(r => r.source === 'shape' || r.constraintKind === 'shape');
  shapeErrorsEl.innerHTML = '';
  if (shapeResults.length === 0) {
    shapeErrorsEl.classList.remove('visible');
    return;
  }
  shapeErrorsEl.classList.add('visible');
  for (const r of shapeResults) {
    const div = document.createElement('div');
    div.className = r.severity === 'warning' ? 'shape-warning-callout' : 'shape-error-callout';
    div.textContent = r.message;
    shapeErrorsEl.appendChild(div);
  }
}

effect(() => {
  engine.structureVersion.value;
  refreshShapeErrors('continuous');
});

// ── Submit ──
btnSubmit.addEventListener('click', async () => {
  const report = engine.getValidationReport({ mode: 'submit' });
  if (!report.valid) {
    refreshShapeErrors('submit');
    alert(`Please fix ${report.counts.error} error(s) before submitting.`);
    return;
  }

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
