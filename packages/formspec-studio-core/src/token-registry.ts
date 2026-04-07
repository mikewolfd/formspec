/** @filedesc Loads and exports the parsed platform token registry. */
import registryDoc from '@formspec-org/layout/token-registry' with { type: 'json' };
import { parseTokenRegistry, type TokenRegistryMap } from './layout-ui-helpers.js';

/** The platform token registry, parsed once at module load. */
export const platformTokenRegistry: TokenRegistryMap = parseTokenRegistry(registryDoc as Record<string, unknown>);
