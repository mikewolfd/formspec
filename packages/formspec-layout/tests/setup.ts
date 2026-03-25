/** @filedesc Global test setup — initializes WASM before all tests. */
import { initFormspecEngine, initFormspecEngineTools } from 'formspec-engine';

await initFormspecEngine();
await initFormspecEngineTools();
