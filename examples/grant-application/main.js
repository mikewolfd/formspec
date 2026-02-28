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
const submitAreaEl = document.querySelector('.submit-area');
const PAGE_TITLES = progressStepEls.map(li => li.getAttribute('data-page'));

formEl.addEventListener('formspec-page-change', (e) => {
  const { index, total, title } = e.detail;
  const isLastPage = index === total - 1;
  const currentIdx = PAGE_TITLES.indexOf(title);

  progressStepEls.forEach((li, i) => {
    li.classList.toggle('active', i === currentIdx);
    li.classList.toggle('valid', i < currentIdx);
    li.classList.toggle('invalid', false);
  });

  submitAreaEl.style.display = isLastPage ? 'flex' : 'none';

  const wizardNextBtn = formEl.querySelector('button.formspec-wizard-next');
  if (wizardNextBtn) wizardNextBtn.style.display = isLastPage ? 'none' : '';
});

// ── Submit ──
btnSubmit.addEventListener('click', async () => {
  const report = engine.getValidationReport({ mode: 'submit' });
  if (!report.valid) {
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
