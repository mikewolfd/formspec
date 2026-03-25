/** @filedesc Slim E2E entry: webcomponent + engine init/render subpaths only (no `formspec-engine` main / fel-api). */
// Import `element` + `components` directly — `src/index` chains `initFormspecEngineTools()` (ADR 0050 slim harness must not).
import { FormspecRender } from '../../../packages/formspec-webcomponent/src/element';
import '../../../packages/formspec-webcomponent/src/formspec-layout.css';
import '../../../packages/formspec-webcomponent/src/formspec-default.css';
import { registerDefaultComponents } from '../../../packages/formspec-webcomponent/src/components';
import { initFormspecEngine, isFormspecEngineInitialized } from 'formspec-engine/init-formspec-engine';

registerDefaultComponents();
void initFormspecEngine().catch((err) => {
    console.warn('[wasm-runtime-network-harness] WASM init failed:', err);
});

customElements.define('formspec-render', FormspecRender);

const renderer = document.createElement('formspec-render') as FormspecRender;
document.getElementById('app')?.appendChild(renderer);
(window as unknown as { renderer: FormspecRender }).renderer = renderer;

(window as unknown as { isFormspecEngineInitialized: typeof isFormspecEngineInitialized }).isFormspecEngineInitialized
    = isFormspecEngineInitialized;
