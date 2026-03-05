import 'formspec-webcomponent/formspec-base.css';
import { FormspecRender } from 'formspec-webcomponent';
customElements.define('formspec-render', FormspecRender);

const SERVER = '/api';

// ── Example registry ──
// Each entry points to a sibling directory under examples/.
// artifacts lists the JSON files to load (definition is required,
// component and theme are optional).
const EXAMPLES = [
  {
    id: 'grant-application',
    name: 'Federal Grant Application',
    description: 'Multi-page wizard with budget, validation, repeats',
    dir: '/examples/grant-application',
    artifacts: { definition: 'definition.json', component: 'component.json', theme: 'theme.json' },
    css: 'grant-bridge.css',
    server: true,
    mappings: ['mapping.json', 'mapping-csv.json', 'mapping-xml.json'],
    registry: 'registry.json',
  },
  {
    id: 'tribal-short',
    name: 'Tribal Annual Report (Short)',
    description: 'Short-form grant report with expenditure tracking',
    dir: '/examples/grant-report',
    artifacts: { definition: 'tribal-short.definition.json', component: 'tribal-short.component.json', theme: 'tribal.theme.json' },
  },
  {
    id: 'tribal-long',
    name: 'Tribal Annual Report (Long)',
    description: 'Detailed report with narratives and service data',
    dir: '/examples/grant-report',
    artifacts: { definition: 'tribal-long.definition.json', component: 'tribal-long.component.json', theme: 'tribal.theme.json' },
  },
  {
    id: 'invoice',
    name: 'Invoice (Line Items)',
    description: 'Repeat groups + calculated totals + CSV export mapping',
    dir: '/examples/invoice',
    artifacts: { definition: 'invoice.definition.json', component: 'invoice.component.json', theme: 'invoice.theme.json' },
  },
  {
    id: 'clinical-intake',
    name: 'Clinical Intake Survey',
    description: 'Screener routing, instances/pre-population, nested repeats',
    dir: '/examples/clinical-intake',
    artifacts: { definition: 'intake.definition.json', component: 'intake.component.json', theme: 'intake.theme.json' },
  },
];

// ── DOM refs ──
const exampleListEl = document.getElementById('example-list');
const mainArea = document.getElementById('main-area');
const emptyState = document.getElementById('empty-state');

let activeExampleId = null;
let activeBridgeLink = null;

// ── Build sidebar ──
for (const ex of EXAMPLES) {
  const li = document.createElement('li');
  li.dataset.id = ex.id;
  li.innerHTML = `
    <span class="example-name">${ex.name}</span>
    <span class="example-desc">${ex.description}</span>
  `;
  li.addEventListener('click', () => loadExample(ex));
  exampleListEl.appendChild(li);
}

// ── Load helpers ──
async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// ── Load & render an example ──
async function loadExample(ex) {
  if (activeExampleId === ex.id) return;
  activeExampleId = ex.id;

  // Update sidebar
  exampleListEl.querySelectorAll('li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === ex.id);
  });

  // Update URL hash
  window.location.hash = ex.id;

  // Show loading state
  mainArea.innerHTML = `
    <div class="state-message">
      <h2>Loading...</h2>
      <p>${ex.name}</p>
    </div>
  `;

  // Remove previous bridge CSS
  if (activeBridgeLink) {
    activeBridgeLink.remove();
    activeBridgeLink = null;
  }

  try {
    // Load artifacts
    const loads = [loadJSON(`${ex.dir}/${ex.artifacts.definition}`)];
    if (ex.artifacts.component) loads.push(loadJSON(`${ex.dir}/${ex.artifacts.component}`));
    else loads.push(Promise.resolve(null));
    if (ex.artifacts.theme) loads.push(loadJSON(`${ex.dir}/${ex.artifacts.theme}`));
    else loads.push(Promise.resolve(null));

    const [definition, componentDoc, themeDoc] = await Promise.all(loads);

    // Load bridge CSS if specified
    if (ex.css) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${ex.dir}/${ex.css}`;
      document.head.appendChild(link);
      activeBridgeLink = link;
    }

    // Build the form area
    mainArea.innerHTML = '';

    // Info bar
    const info = document.createElement('div');
    info.className = 'example-info';
    info.innerHTML = `
      <h2>${definition.title || ex.name}</h2>
      ${definition.version ? `<span class="info-version">v${definition.version}</span>` : ''}
      ${definition.description ? `<span class="info-desc">${definition.description}</span>` : ''}
    `;
    mainArea.appendChild(info);

    // Form container
    const container = document.createElement('div');
    container.className = 'form-container';

    // Client submit panel (always available; shown in a tab)
    const clientPanel = document.createElement('div');
    clientPanel.className = 'client-response';
    clientPanel.id = 'client-response';
    clientPanel.setAttribute('aria-live', 'polite');
    clientPanel.innerHTML = `
      <h3>Client Submit</h3>
      <div class="client-meta" id="client-meta"></div>
      <p class="client-empty" id="client-empty">No client-side submit yet. Click "Submit (Client)" to generate a response and validation report.</p>
      <details class="client-details" open>
        <summary>Validation Report</summary>
        <pre id="client-validation-pre"></pre>
      </details>
      <details class="client-details">
        <summary>Response JSON</summary>
        <pre id="client-response-pre"></pre>
      </details>
    `;

    // Server response panel (optional; shown in a tab)
    const serverPanel = document.createElement('div');
    serverPanel.className = 'server-response';
    serverPanel.id = 'server-response';
    serverPanel.setAttribute('aria-live', 'polite');
    serverPanel.innerHTML = `
      <h3>Server Response</h3>
      <p class="server-empty" id="server-empty">No server response yet. Submit a valid form to send it to the server.</p>
      <pre id="server-response-pre"></pre>
    `;

    // Toolbar actions
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `
      <button type="button" class="action-btn" id="action-submit">Submit (Client)</button>
      <button type="button" class="action-btn secondary" id="action-reset">Reset</button>
    `;

    const formEl = document.createElement('formspec-render');
    formEl.id = 'form';

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'example-tabs';
    tabs.setAttribute('role', 'tablist');

    const tabForm = document.createElement('button');
    tabForm.type = 'button';
    tabForm.className = 'example-tab';
    tabForm.id = 'tab-form';
    tabForm.setAttribute('role', 'tab');
    tabForm.setAttribute('aria-controls', 'panel-form');
    tabForm.textContent = 'Form';

    const tabClient = document.createElement('button');
    tabClient.type = 'button';
    tabClient.className = 'example-tab';
    tabClient.id = 'tab-client';
    tabClient.setAttribute('role', 'tab');
    tabClient.setAttribute('aria-controls', 'panel-client');
    tabClient.textContent = 'Client Submit';

    const tabServer = document.createElement('button');
    tabServer.type = 'button';
    tabServer.className = 'example-tab';
    tabServer.id = 'tab-server';
    tabServer.setAttribute('role', 'tab');
    tabServer.setAttribute('aria-controls', 'panel-server');
    tabServer.textContent = 'Server Response';

    tabs.appendChild(tabForm);
    tabs.appendChild(tabClient);
    if (ex.server) tabs.appendChild(tabServer);

    const panelForm = document.createElement('div');
    panelForm.className = 'example-tabpanel';
    panelForm.id = 'panel-form';
    panelForm.setAttribute('role', 'tabpanel');
    panelForm.setAttribute('aria-labelledby', 'tab-form');

    const panelClient = document.createElement('div');
    panelClient.className = 'example-tabpanel';
    panelClient.id = 'panel-client';
    panelClient.setAttribute('role', 'tabpanel');
    panelClient.setAttribute('aria-labelledby', 'tab-client');

    const panelServer = document.createElement('div');
    panelServer.className = 'example-tabpanel';
    panelServer.id = 'panel-server';
    panelServer.setAttribute('role', 'tabpanel');
    panelServer.setAttribute('aria-labelledby', 'tab-server');

    panelForm.appendChild(formEl);
    panelClient.appendChild(clientPanel);
    panelServer.appendChild(serverPanel);

    function setActiveTab(which) {
      const isForm = which === 'form';
      const isClient = which === 'client';
      const isServer = which === 'server';

      tabForm.setAttribute('aria-selected', String(isForm));
      tabClient.setAttribute('aria-selected', String(isClient));
      if (ex.server) tabServer.setAttribute('aria-selected', String(isServer));

      tabForm.classList.toggle('active', isForm);
      tabClient.classList.toggle('active', isClient);
      if (ex.server) tabServer.classList.toggle('active', isServer);

      panelForm.classList.toggle('active', isForm);
      panelClient.classList.toggle('active', isClient);
      if (ex.server) panelServer.classList.toggle('active', isServer);
    }

    tabForm.addEventListener('click', () => setActiveTab('form'));
    tabClient.addEventListener('click', () => setActiveTab('client'));
    tabServer.addEventListener('click', () => setActiveTab('server'));

    setActiveTab('form');

    actions.querySelector('#action-submit').addEventListener('click', () => {
      // This will touch all fields and update latest submit detail; it will also
      // emit formspec-submit by default, which we use to render panels below.
      formEl.submit({ mode: 'submit', emitEvent: true });
    });

    actions.querySelector('#action-reset').addEventListener('click', () => {
      // Reloading the same example is the simplest reset semantics.
      activeExampleId = null;
      loadExample(ex);
    });

    container.appendChild(actions);
    container.appendChild(tabs);
    container.appendChild(panelForm);
    container.appendChild(panelClient);
    if (ex.server) container.appendChild(panelServer);

    mainArea.appendChild(container);

    // Set artifacts
    formEl.definition = definition;
    if (componentDoc) formEl.componentDocument = componentDoc;
    if (themeDoc) formEl.themeDocument = themeDoc;

    // Always show the client-side submit detail (response + validationReport).
    // Optionally forward valid responses to the server (grant-application).
    formEl.addEventListener('formspec-submit', async (e) => {
      const submitDetail = e.detail || {};
      const vr = submitDetail.validationReport || {};
      const response = submitDetail.response || {};

      const metaEl = clientPanel.querySelector('#client-meta');
      const emptyEl = clientPanel.querySelector('#client-empty');
      metaEl.textContent = vr.counts
        ? `valid=${!!vr.valid}  errors=${vr.counts.error || 0}  warnings=${vr.counts.warning || 0}`
        : `valid=${!!vr.valid}`;

      if (emptyEl) emptyEl.remove();
      clientPanel.querySelector('#client-validation-pre').textContent = JSON.stringify(vr, null, 2);
      clientPanel.querySelector('#client-response-pre').textContent = JSON.stringify(response, null, 2);
      setActiveTab('client');

      if (!ex.server) return;
      if (!vr.valid) return;

      try {
        const res = await fetch(`${SERVER}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        const result = await res.json();
        const serverEmpty = serverPanel.querySelector('#server-empty');
        if (serverEmpty) serverEmpty.remove();
        serverPanel.querySelector('pre').textContent = JSON.stringify(result, null, 2);
        setActiveTab('server');
      } catch (err) {
        const serverEmpty = serverPanel.querySelector('#server-empty');
        if (serverEmpty) serverEmpty.remove();
        serverPanel.querySelector('pre').textContent = `Error contacting server: ${err.message}`;
        setActiveTab('server');
      }
    });

  } catch (err) {
    mainArea.innerHTML = `
      <div class="state-message">
        <h2>Failed to load</h2>
        <p>${err.message}</p>
      </div>
    `;
    activeExampleId = null;
  }
}

// ── Load from hash on startup ──
function loadFromHash() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const ex = EXAMPLES.find(e => e.id === hash);
    if (ex) {
      loadExample(ex);
      return;
    }
  }
  // Auto-load first example
  if (EXAMPLES.length > 0) {
    loadExample(EXAMPLES[0]);
  }
}

window.addEventListener('hashchange', loadFromHash);
loadFromHash();
