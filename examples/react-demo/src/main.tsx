/** @filedesc Entry point: registers formspec-render custom element with the shadcn adapter. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { FormspecRender, globalRegistry } from 'formspec-webcomponent';
import { shadcnAdapter } from 'formspec-adapters/shadcn';
import { initFormspecEngine } from 'formspec-engine';
import 'formspec-webcomponent/formspec-layout.css';
import './globals.css';
import { App } from './App';

// Initialize WASM engine, register custom element + shadcn adapter
async function boot() {
    await initFormspecEngine();

    customElements.define('formspec-render', FormspecRender);
    globalRegistry.registerAdapter(shadcnAdapter);
    globalRegistry.setAdapter('shadcn');

    createRoot(document.getElementById('root')!).render(<App />);
}

boot().catch(console.error);
