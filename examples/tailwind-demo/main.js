/** @filedesc Tailwind adapter reference app — loads demo artifacts and wires submit feedback. */
import './tailwind-app.css';
import 'formspec-webcomponent/formspec-layout.css';
import 'formspec-webcomponent/formspec-default.css';
import { FormspecRender, globalRegistry } from 'formspec-webcomponent';
import { tailwindAdapter } from 'formspec-adapters';
import { initFormspecEngine } from 'formspec-engine';
import definition from './demo.definition.json';
import componentDocument from './demo.component.json';
import themeDocument from './demo.theme.json';

await initFormspecEngine();
document.documentElement.dataset.formspecWasmReady = '1';

customElements.define('formspec-render', FormspecRender);
globalRegistry.registerAdapter(tailwindAdapter);
globalRegistry.setAdapter('tailwind');

const mount = document.getElementById('form-mount');
const form = document.createElement('formspec-render');
form.id = 'demo-form';
mount.appendChild(form);

form.definition = definition;
form.componentDocument = componentDocument;
form.themeDocument = themeDocument;

const outValid = document.getElementById('out-valid');
const outCounts = document.getElementById('out-counts');
const preVr = document.getElementById('pre-validation');
const preResp = document.getElementById('pre-response');
const panel = document.getElementById('output-panel');

form.addEventListener('formspec-submit', (e) => {
  const d = e.detail || {};
  const vr = d.validationReport || {};
  const response = d.response || {};
  outValid.textContent = vr.valid ? 'Valid' : 'Invalid';
  outValid.className = vr.valid
    ? 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40'
    : 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/40';
  const c = vr.counts || {};
  outCounts.textContent = `errors ${c.error ?? 0} · warnings ${c.warning ?? 0} · info ${c.info ?? 0}`;
  preVr.textContent = JSON.stringify(vr, null, 2);
  preResp.textContent = JSON.stringify(response, null, 2);
  panel.classList.remove('opacity-0', 'translate-y-2');
  panel.classList.add('opacity-100', 'translate-y-0');
});

document.getElementById('btn-submit').addEventListener('click', () => {
  form.submit({ mode: 'submit', emitEvent: true });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  form.definition = null;
  form.componentDocument = null;
  form.themeDocument = null;
  requestAnimationFrame(() => {
    form.definition = definition;
    form.componentDocument = componentDocument;
    form.themeDocument = themeDocument;
  });
  panel.classList.add('opacity-0', 'translate-y-2');
  panel.classList.remove('opacity-100', 'translate-y-0');
});
