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
const btnBackScreener = document.getElementById('btn-back-screener');
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
const progressScreenerEl = document.querySelector('#progress-steps li[data-step="screener"]');
const progressFormStepEls = progressStepEls.filter(li => !li.hasAttribute('data-step'));
const backScreenerAreaEl = document.querySelector('.back-screener-area');
const PAGE_TITLES = progressFormStepEls.map(li => li.getAttribute('data-page'));
let currentFormPageIndex = -1;
let screenerState = typeof formEl.getScreenerState === 'function'
  ? formEl.getScreenerState()
  : { completed: false, routeType: 'none', route: null };

function clearRedirectNotice() {
  const formArea = formEl.closest('.form-area');
  formArea?.querySelector('.formspec-screener-redirect')?.remove();
}

function showRedirectNotice(route) {
  const notice = document.createElement('div');
  notice.className = 'formspec-screener formspec-screener-redirect';
  notice.innerHTML = `
    <h2 class="formspec-screener-heading">You're being redirected</h2>
    <p class="formspec-screener-intro">Based on your answers, the appropriate form is:</p>
    <p style="font-weight:600; color: var(--color-primary)">${route.label || route.target}</p>
    <p class="formspec-screener-intro" style="font-size:14px; color: var(--color-neutral-700)">In a production system this would navigate to the correct form automatically.</p>
  `;
  clearRedirectNotice();
  formEl.after(notice);
}

function renderProgress() {
  progressStepEls.forEach((li) => {
    li.classList.remove('active', 'valid', 'invalid');
  });

  if (!screenerState?.completed) {
    progressScreenerEl?.classList.add('active');
    return;
  }

  progressScreenerEl?.classList.add('valid');
  progressFormStepEls.forEach((li, i) => {
    li.classList.toggle('active', i === currentFormPageIndex);
    li.classList.toggle('valid', i < currentFormPageIndex);
  });
}

function syncBackScreenerButton() {
  const show = !!screenerState?.completed && currentFormPageIndex === 0;
  btnBackScreener.style.display = show ? 'inline-block' : 'none';
}

function restartToScreener() {
  if (typeof formEl.restartScreener === 'function') {
    formEl.restartScreener();
  }
  currentFormPageIndex = -1;
  backScreenerAreaEl?.appendChild(btnBackScreener);
  btnBackScreener.style.display = 'none';
}

renderProgress();
syncBackScreenerButton();

formEl.addEventListener('formspec-page-change', (e) => {
  const { title } = e.detail;
  const currentIdx = PAGE_TITLES.indexOf(title);
  currentFormPageIndex = currentIdx;
  renderProgress();
  syncBackScreenerButton();
});

formEl.addEventListener('formspec-screener-state-change', (e) => {
  const detail = e.detail || {};
  screenerState = detail;

  if (!screenerState.completed) {
    currentFormPageIndex = -1;
  } else if (currentFormPageIndex < 0) {
    currentFormPageIndex = 0;
  }

  if (detail.routeType === 'external' && detail.route) {
    showRedirectNotice(detail.route);
  } else {
    clearRedirectNotice();
  }

  renderProgress();
  syncBackScreenerButton();
});

progressScreenerEl?.addEventListener('click', () => {
  if (!screenerState?.completed) return;
  restartToScreener();
});

btnBackScreener.addEventListener('click', () => {
  restartToScreener();
});

function setSubmitPending(isPending, textWhenPending = 'Submitting…') {
  if (typeof formEl.setSubmitPending === 'function') {
    try {
      formEl.setSubmitPending(isPending);
      return;
    } catch {
    }
  }

  const buttons = Array.from(formEl.querySelectorAll('button.formspec-submit'));
  for (const button of buttons) {
    if (!(button instanceof HTMLButtonElement)) continue;
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent || 'Submit';
    }
    button.disabled = isPending;
    button.textContent = isPending ? textWhenPending : button.dataset.defaultLabel;
  }
}

formEl.addEventListener('formspec-submit', async (e) => {
  const submitDetail = e.detail || {};
  if (!submitDetail.validationReport?.valid) return;

  const response = submitDetail.response;
  setSubmitPending(true);

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
    setSubmitPending(false);
  }
});
