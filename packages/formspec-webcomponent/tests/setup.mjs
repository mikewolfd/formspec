/** @filedesc Test setup — initializes WASM before any test files run. */
import { initFormspecEngine } from '@formspec-org/engine/init-formspec-engine';

await initFormspecEngine();
