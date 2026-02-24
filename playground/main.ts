import './styles.css';
import { FormspecRender } from '../packages/formspec-webcomponent/src/index';

import holisticDefinitionV1 from '../tests/e2e/fixtures/kitchen-sink-holistic/definition.v1.json';
import holisticDefinitionV2 from '../tests/e2e/fixtures/kitchen-sink-holistic/definition.v2.json';
import holisticTheme from '../tests/e2e/fixtures/kitchen-sink-holistic/theme.json';
import holisticComponent from '../tests/e2e/fixtures/kitchen-sink-holistic/component.json';

import smokeDefinition from '../tests/e2e/fixtures/kitchen-sink-smoke.definition.json';
import smokeComponent from '../tests/e2e/fixtures/kitchen-sink-smoke.component.json';

type Mode = 'playground' | 'demo';

type FixtureDocs = {
  definition: any;
  theme: any | null;
  component: any | null;
};

type Fixture = {
  id: string;
  label: string;
  description: string;
  docs: FixtureDocs;
  demoAction: (renderer: FormspecRender) => void;
};

type AppState = {
  mode: Mode;
  activeFixtureId: string;
  activeDocs: FixtureDocs;
  lastSubmitted: any | null;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function normalizeDefinitionForEngine(definition: any): any {
  const normalized = clone(definition);
  if (normalized.optionSets && typeof normalized.optionSets === 'object') {
    for (const [key, value] of Object.entries(normalized.optionSets as Record<string, any>)) {
      if (value && typeof value === 'object' && Array.isArray((value as any).options)) {
        normalized.optionSets[key] = (value as any).options;
      }
    }
  }
  return normalized;
}

function safeSet(renderer: FormspecRender, path: string, value: unknown): void {
  const engine: any = renderer.getEngine();
  if (!engine || !engine.signals || !engine.signals[path]) return;
  engine.setValue(path, value);
}

function addRepeat(renderer: FormspecRender, path: string): void {
  const engine: any = renderer.getEngine();
  if (!engine || !engine.repeats || !engine.repeats[path]) return;
  engine.addRepeatInstance(path);
}

const fixtures: Fixture[] = [
  {
    id: 'holistic-v1',
    label: 'Holistic v1',
    description: 'ADR-0021 fixture bundle (definition v1 + theme + component)',
    docs: {
      definition: holisticDefinitionV1,
      theme: holisticTheme,
      component: holisticComponent,
    },
    demoAction: (renderer) => {
      safeSet(renderer, 'fullName', 'Demo Operator');
      safeSet(renderer, 'profileMode', 'advanced');
      safeSet(renderer, 'vipEnabled', true);
      safeSet(renderer, 'vipCode', 'DEMO-777');

      safeSet(renderer, 'lineItems[0].lineName', 'Starter Pack');
      safeSet(renderer, 'lineItems[0].lineQty', 2);
      safeSet(renderer, 'lineItems[0].linePrice', 120);

      addRepeat(renderer, 'lineItems');
      safeSet(renderer, 'lineItems[1].lineName', 'Premium Pack');
      safeSet(renderer, 'lineItems[1].lineQty', 1);
      safeSet(renderer, 'lineItems[1].linePrice', 260);

      safeSet(renderer, 'budget', 700);
      safeSet(renderer, 'startDate', '2026-03-01');
      safeSet(renderer, 'endDate', '2026-03-15');
      safeSet(renderer, 'website', 'https://demo.example');
      safeSet(renderer, 'tags', ['new', 'priority']);
    },
  },
  {
    id: 'holistic-v2',
    label: 'Holistic v2',
    description: 'Migration target definition with same presentation docs',
    docs: {
      definition: holisticDefinitionV2,
      theme: holisticTheme,
      component: holisticComponent,
    },
    demoAction: (renderer) => {
      safeSet(renderer, 'fullName', 'Demo Migrated');
      safeSet(renderer, 'profileMode', 'advanced');
      safeSet(renderer, 'vipEnabled', true);
      safeSet(renderer, 'vipCode', 'MIG-2026');
      safeSet(renderer, 'budget', 900);
      safeSet(renderer, 'website', 'https://migrated.example');
    },
  },
  {
    id: 'smoke',
    label: 'Smoke Fixture',
    description: 'Compact smoke fixture with progressive components',
    docs: {
      definition: smokeDefinition,
      theme: null,
      component: smokeComponent,
    },
    demoAction: (renderer) => {
      safeSet(renderer, 'userName', 'Demo User');
      safeSet(renderer, 'showAdvanced', true);
      safeSet(renderer, 'theme', 'hc');
      safeSet(renderer, 'notifications', ['email', 'push']);

      safeSet(renderer, 'inventory[0].itemName', 'Laptop');
      safeSet(renderer, 'inventory[0].price', 499.99);
      safeSet(renderer, 'inventory[0].quantity', 2);
      addRepeat(renderer, 'inventory');
      safeSet(renderer, 'inventory[1].itemName', 'Dock');
      safeSet(renderer, 'inventory[1].price', 89.5);
      safeSet(renderer, 'inventory[1].quantity', 1);

      safeSet(renderer, 'budget', 1300);
      safeSet(renderer, 'startDate', '2026-04-01');
      safeSet(renderer, 'endDate', '2026-04-30');
    },
  },
];

function fixtureById(id: string): Fixture {
  return fixtures.find((fixture) => fixture.id === id) || fixtures[0];
}

function detectMode(): Mode {
  const path = window.location.pathname.toLowerCase();
  if (path === '/') {
    history.replaceState({}, '', '/playground');
    return 'playground';
  }
  return path.startsWith('/demo') ? 'demo' : 'playground';
}

function detectRequestedFixtureId(): string {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('fixture');
  if (!requested) return fixtures[0].id;
  return fixtureById(requested).id;
}

const state: AppState = {
  mode: detectMode(),
  activeFixtureId: detectRequestedFixtureId(),
  activeDocs: {
    definition: clone(fixtureById(detectRequestedFixtureId()).docs.definition),
    theme: clone(fixtureById(detectRequestedFixtureId()).docs.theme),
    component: clone(fixtureById(detectRequestedFixtureId()).docs.component),
  },
  lastSubmitted: null,
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = `
  <div class="shell shell-${state.mode}">
    <header class="topbar">
      <div class="topbar-copy">
        <p class="eyebrow">Formspec Runtime Studio</p>
        <h1>${state.mode === 'demo' ? 'Demo Mode' : 'Playground Mode'}</h1>
        <p>${state.mode === 'demo' ? 'Curated flow over real engine semantics.' : 'Edit docs, run form, inspect engine artifacts.'}</p>
      </div>
      <nav class="mode-nav">
        <a id="mode-playground-link" href="/playground?fixture=${encodeURIComponent(state.activeFixtureId)}" class="${state.mode === 'playground' ? 'active' : ''}">Playground</a>
        <a id="mode-demo-link" href="/demo?fixture=${encodeURIComponent(state.activeFixtureId)}" class="${state.mode === 'demo' ? 'active' : ''}">Demo</a>
      </nav>
    </header>

    <main class="workspace">
      <section class="panel controls">
        <h2>Scenario</h2>
        <label for="fixture-select">Fixture</label>
        <select id="fixture-select"></select>
        <p id="fixture-description" class="muted"></p>
        <div class="button-row">
          <button id="load-fixture-btn" type="button">Load Fixture</button>
          <button id="reset-fixture-btn" type="button">Reset</button>
        </div>

        ${state.mode === 'playground'
          ? `
          <h3>Definition JSON</h3>
          <textarea id="definition-editor" spellcheck="false"></textarea>

          <h3>Theme JSON</h3>
          <textarea id="theme-editor" spellcheck="false"></textarea>

          <h3>Component JSON</h3>
          <textarea id="component-editor" spellcheck="false"></textarea>

          <div class="button-row">
            <button id="apply-docs-btn" type="button">Apply Documents</button>
          </div>
          `
          : `
          <h3>Demo Script</h3>
          <p class="muted">Runs a deterministic scripted interaction over the loaded fixture.</p>
          <div class="button-row">
            <button id="run-demo-btn" type="button">Run Script</button>
          </div>
          `}
      </section>

      <section class="panel preview">
        <div class="preview-head">
          <h2>Preview</h2>
          <div class="button-row">
            <button id="refresh-artifacts-btn" type="button">Refresh Artifacts</button>
            <button id="submit-form-btn" type="button">Submit Form</button>
          </div>
        </div>
        <div id="preview-host" class="preview-host"></div>
      </section>

      <section class="panel artifacts">
        <h2>Artifacts</h2>
        <p id="status" class="status">Ready.</p>
        <h3>Validation Report (submit)</h3>
        <pre id="validation-report"></pre>
        <h3>Response (submit mode)</h3>
        <pre id="response-report"></pre>
        <h3>Last Submit Event</h3>
        <pre id="last-submit"></pre>
      </section>
    </main>
  </div>
`;

const fixtureSelect = document.querySelector<HTMLSelectElement>('#fixture-select');
const fixtureDescription = document.querySelector<HTMLParagraphElement>('#fixture-description');
const statusEl = document.querySelector<HTMLParagraphElement>('#status');
const validationReportEl = document.querySelector<HTMLPreElement>('#validation-report');
const responseReportEl = document.querySelector<HTMLPreElement>('#response-report');
const lastSubmitEl = document.querySelector<HTMLPreElement>('#last-submit');
const previewHost = document.querySelector<HTMLDivElement>('#preview-host');

if (
  !fixtureSelect ||
  !fixtureDescription ||
  !statusEl ||
  !validationReportEl ||
  !responseReportEl ||
  !lastSubmitEl ||
  !previewHost
) {
  throw new Error('Missing required playground elements');
}

const definitionEditor = document.querySelector<HTMLTextAreaElement>('#definition-editor');
const themeEditor = document.querySelector<HTMLTextAreaElement>('#theme-editor');
const componentEditor = document.querySelector<HTMLTextAreaElement>('#component-editor');

let renderer: FormspecRender;

function setStatus(message: string, type: 'ok' | 'error' | 'info' = 'info'): void {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function mountRenderer(): void {
  previewHost.innerHTML = '';
  if (!customElements.get('formspec-render')) {
    customElements.define('formspec-render', FormspecRender);
  }
  renderer = document.createElement('formspec-render') as FormspecRender;
  previewHost.appendChild(renderer);

  renderer.addEventListener('formspec-submit', (event: Event) => {
    state.lastSubmitted = (event as CustomEvent).detail;
    lastSubmitEl.textContent = pretty(state.lastSubmitted);
    setStatus(`Submit event captured at ${new Date().toISOString()}`, 'ok');
    refreshArtifacts();
  });

  (window as any).renderer = renderer;
}

function parseEditorJSON(id: string, value: string): any | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${id} JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadDocsIntoEditors(docs: FixtureDocs): void {
  if (!definitionEditor || !themeEditor || !componentEditor) return;
  definitionEditor.value = pretty(docs.definition);
  themeEditor.value = docs.theme ? pretty(docs.theme) : '';
  componentEditor.value = docs.component ? pretty(docs.component) : '';
}

function applyDocs(docs: FixtureDocs): void {
  state.activeDocs = {
    definition: clone(docs.definition),
    theme: docs.theme ? clone(docs.theme) : null,
    component: docs.component ? clone(docs.component) : null,
  };

  renderer.definition = normalizeDefinitionForEngine(state.activeDocs.definition);
  renderer.themeDocument = state.activeDocs.theme;
  renderer.componentDocument = state.activeDocs.component;
  refreshArtifacts();
}

function refreshArtifacts(): void {
  const engine: any = renderer.getEngine();
  if (!engine) {
    validationReportEl.textContent = '{}';
    responseReportEl.textContent = '{}';
    return;
  }

  const validationSubmit = engine.getValidationReport({ mode: 'submit' });
  const responseSubmit = engine.getResponse({ mode: 'submit' });

  validationReportEl.textContent = pretty(validationSubmit);
  responseReportEl.textContent = pretty(responseSubmit);
  lastSubmitEl.textContent = state.lastSubmitted ? pretty(state.lastSubmitted) : '{}';
}

function loadFixture(id: string): void {
  const fixture = fixtureById(id);
  state.activeFixtureId = fixture.id;
  fixtureSelect.value = fixture.id;
  fixtureDescription.textContent = fixture.description;
  const url = new URL(window.location.href);
  url.searchParams.set('fixture', fixture.id);
  history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);

  const playgroundLink = document.querySelector<HTMLAnchorElement>('#mode-playground-link');
  const demoLink = document.querySelector<HTMLAnchorElement>('#mode-demo-link');
  if (playgroundLink) playgroundLink.href = `/playground?fixture=${encodeURIComponent(fixture.id)}`;
  if (demoLink) demoLink.href = `/demo?fixture=${encodeURIComponent(fixture.id)}`;

  const docs = {
    definition: clone(fixture.docs.definition),
    theme: fixture.docs.theme ? clone(fixture.docs.theme) : null,
    component: fixture.docs.component ? clone(fixture.docs.component) : null,
  };

  loadDocsIntoEditors(docs);
  applyDocs(docs);
  setStatus(`Loaded fixture: ${fixture.label}`, 'ok');
}

function runDemoScript(): void {
  const fixture = fixtureById(state.activeFixtureId);
  fixture.demoAction(renderer);
  refreshArtifacts();
  setStatus(`Demo script completed for ${fixture.label}`, 'ok');
}

for (const fixture of fixtures) {
  const option = document.createElement('option');
  option.value = fixture.id;
  option.textContent = fixture.label;
  fixtureSelect.appendChild(option);
}

const loadFixtureBtn = document.querySelector<HTMLButtonElement>('#load-fixture-btn');
const resetFixtureBtn = document.querySelector<HTMLButtonElement>('#reset-fixture-btn');
const refreshArtifactsBtn = document.querySelector<HTMLButtonElement>('#refresh-artifacts-btn');
const submitFormBtn = document.querySelector<HTMLButtonElement>('#submit-form-btn');
const applyDocsBtn = document.querySelector<HTMLButtonElement>('#apply-docs-btn');
const runDemoBtn = document.querySelector<HTMLButtonElement>('#run-demo-btn');

if (loadFixtureBtn) {
  loadFixtureBtn.addEventListener('click', () => loadFixture(fixtureSelect.value));
}

if (resetFixtureBtn) {
  resetFixtureBtn.addEventListener('click', () => loadFixture(state.activeFixtureId));
}

if (refreshArtifactsBtn) {
  refreshArtifactsBtn.addEventListener('click', () => {
    refreshArtifacts();
    setStatus('Artifacts refreshed', 'info');
  });
}

if (submitFormBtn) {
  submitFormBtn.addEventListener('click', () => {
    const submit = renderer.querySelector<HTMLButtonElement>('button.formspec-submit');
    if (!submit) {
      setStatus('Submit button not found in renderer output', 'error');
      return;
    }
    submit.click();
  });
}

if (applyDocsBtn && definitionEditor && themeEditor && componentEditor) {
  applyDocsBtn.addEventListener('click', () => {
    try {
      const docs: FixtureDocs = {
        definition: parseEditorJSON('Definition', definitionEditor.value),
        theme: parseEditorJSON('Theme', themeEditor.value),
        component: parseEditorJSON('Component', componentEditor.value),
      };

      if (!docs.definition) {
        setStatus('Definition is required', 'error');
        return;
      }

      applyDocs(docs);
      setStatus('Applied edited documents', 'ok');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), 'error');
    }
  });
}

if (runDemoBtn) {
  runDemoBtn.addEventListener('click', () => {
    runDemoScript();
  });
}

mountRenderer();
loadFixture(state.activeFixtureId);
