import type { ProjectBundle } from 'formspec-studio-core';
import type { InquestHandoffPayloadV1, InquestSessionV1 } from '../contracts/inquest';
import { isInquestHandoffPayloadV1, isInquestSessionV1 } from '../contracts/validators';
import { createBrowserKVStore } from './browser-store';

const kvStore = createBrowserKVStore('formspec-studio', 'inquest-records', 'formspec-studio:');
const RECENT_SESSIONS_KEY = 'formspec-studio:inquest:recent-sessions';
const PROVIDER_PREFS_KEY = 'formspec-studio:inquest:provider-prefs';

const memoryLocalStore = (() => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
})();

function localStore() {
  const candidate = (typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage) as Partial<typeof memoryLocalStore> | undefined;
  if (
    candidate
    && typeof candidate.getItem === 'function'
    && typeof candidate.setItem === 'function'
    && typeof candidate.removeItem === 'function'
  ) {
    return candidate;
  }
  return memoryLocalStore;
}

export interface RecentSessionEntry {
  sessionId: string;
  title: string;
  updatedAt: string;
  phase: InquestSessionV1['phase'];
}

export interface ProviderPreferences {
  selectedProviderId?: string;
  rememberedKeys: Record<string, string>;
}

function readLocalJson<T>(key: string, fallback: T): T {
  const raw = localStore().getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  localStore().setItem(key, JSON.stringify(value));
}

function sessionKey(sessionId: string): string {
  return `inquest:session:${sessionId}`;
}

function handoffKey(handoffId: string): string {
  return `inquest:handoff:${handoffId}`;
}

function bootstrapProjectKey(projectId: string): string {
  return `inquest:project:${projectId}`;
}

export async function saveInquestSession(session: InquestSessionV1): Promise<void> {
  await kvStore.set(sessionKey(session.sessionId), session);

  const existing = readLocalJson<RecentSessionEntry[]>(RECENT_SESSIONS_KEY, []);
  const next = [
    {
      sessionId: session.sessionId,
      title: session.title,
      updatedAt: session.updatedAt,
      phase: session.phase,
    },
    ...existing.filter((entry) => entry.sessionId !== session.sessionId),
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 12);

  writeLocalJson(RECENT_SESSIONS_KEY, next);
}

export async function loadInquestSession(sessionId: string): Promise<InquestSessionV1 | undefined> {
  const session = await kvStore.get<unknown>(sessionKey(sessionId));
  return isInquestSessionV1(session) ? session : undefined;
}

export function listRecentInquestSessions(): RecentSessionEntry[] {
  return readLocalJson<RecentSessionEntry[]>(RECENT_SESSIONS_KEY, []);
}

export async function saveHandoffPayload(payload: InquestHandoffPayloadV1): Promise<void> {
  await kvStore.set(handoffKey(payload.handoffId), payload);
}

export async function loadHandoffPayload(handoffId: string): Promise<InquestHandoffPayloadV1 | undefined> {
  const payload = await kvStore.get<unknown>(handoffKey(handoffId));
  return isInquestHandoffPayloadV1(payload) ? payload : undefined;
}

export async function deleteHandoffPayload(handoffId: string): Promise<void> {
  await kvStore.delete(handoffKey(handoffId));
}

export async function saveBootstrapProject(projectId: string, bundle: ProjectBundle): Promise<void> {
  await kvStore.set(bootstrapProjectKey(projectId), bundle);
}

export async function loadBootstrapProject(projectId: string): Promise<ProjectBundle | undefined> {
  return kvStore.get<ProjectBundle>(bootstrapProjectKey(projectId));
}

export function loadProviderPreferences(): ProviderPreferences {
  return readLocalJson<ProviderPreferences>(PROVIDER_PREFS_KEY, {
    rememberedKeys: {},
  });
}

export function saveSelectedProvider(providerId?: string): void {
  const prefs = loadProviderPreferences();
  prefs.selectedProviderId = providerId;
  writeLocalJson(PROVIDER_PREFS_KEY, prefs);
}

export function rememberProviderKey(providerId: string, apiKey: string): void {
  const prefs = loadProviderPreferences();
  prefs.rememberedKeys[providerId] = apiKey;
  writeLocalJson(PROVIDER_PREFS_KEY, prefs);
}

export function clearProviderKey(providerId: string): void {
  const prefs = loadProviderPreferences();
  delete prefs.rememberedKeys[providerId];
  writeLocalJson(PROVIDER_PREFS_KEY, prefs);
}
