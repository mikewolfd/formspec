/** @filedesc Test setup — initializes WASM before any test files run. */
import { initFormspecEngine } from 'formspec-engine/init-formspec-engine';

await initFormspecEngine();
