/** @filedesc Global test setup — initializes WASM before all tests. */
import { initFormspecEngine, initFormspecEngineTools } from '@formspec-org/engine';

await initFormspecEngine();
await initFormspecEngineTools();
