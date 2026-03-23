/** @filedesc Test setup — initializes runtime + tools WASM before any test files run. */
import { initFormspecEngine, initFormspecEngineTools } from '../dist/init-formspec-engine.js';

await initFormspecEngine();
await initFormspecEngineTools();
