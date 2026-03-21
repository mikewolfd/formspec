/** @filedesc Entry point for the Studio app; registers the formspec-render custom element and mounts App. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initWasm } from 'formspec-engine';
import { FormspecRender } from 'formspec-webcomponent';
import { App } from './App';
import './index.css';

if (!customElements.get('formspec-render')) {
  customElements.define('formspec-render', FormspecRender);
}

async function bootstrap(): Promise<void> {
  await initWasm();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
