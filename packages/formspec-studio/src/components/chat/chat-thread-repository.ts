/** @filedesc Dependency-inverted chat-thread persistence port with a localStorage adapter. */
import { SessionStore, type ChatSessionState, type SessionSummary, type StorageBackend } from '@formspec-org/chat';

export interface ListThreadsInput {
  limit?: number;
  cursor?: string | null;
  projectScope?: string;
}

export interface ListThreadsResult {
  items: SessionSummary[];
  nextCursor?: string | null;
}

export interface LoadThreadInput {
  projectScope?: string;
}

export interface SaveThreadInput {
  projectScope?: string;
  expectedRevision?: string | null;
}

export interface SaveThreadResult {
  revision?: string | null;
}

export interface ClearThreadsInput {
  projectScope?: string;
}

export interface ChatThreadRepository {
  listThreads(input?: ListThreadsInput): Promise<ListThreadsResult>;
  loadThread(id: string, input?: LoadThreadInput): Promise<ChatSessionState | null>;
  saveThread(state: ChatSessionState, input?: SaveThreadInput): Promise<SaveThreadResult>;
  deleteThread(id: string, input?: LoadThreadInput): Promise<void>;
  clearThreads(input?: ClearThreadsInput): Promise<void>;
}

interface LocalChatThreadRepositoryOptions {
  maxThreads?: number;
}

const DEFAULT_SCOPE = 'global';
const DEFAULT_MAX_THREADS = 50;
const STORAGE_SCOPE_PREFIX = 'formspec-chat:scope:';
const SESSION_KEY_PREFIX = 'formspec-chat:session:';
const SESSION_INDEX_KEY = 'formspec-chat:session-index';
const SESSION_SCHEMA_VERSION = 1;
const MIGRATION_FLAG_PREFIX = 'formspec-chat:migrated:scope:';

interface SessionEnvelopeV1 {
  schemaVersion: 1;
  revision: string;
  state: ChatSessionState;
}

type SessionEnvelope = SessionEnvelopeV1;

class ScopedSessionStorageBackend implements StorageBackend {
  constructor(
    private readonly storage: StorageBackend,
    private readonly scope: string,
  ) {}

  private scopedKey(key: string): string {
    return `${STORAGE_SCOPE_PREFIX}${this.scope}:${key}`;
  }

  private isSessionPayloadKey(key: string): boolean {
    return key.startsWith(SESSION_KEY_PREFIX);
  }

  getItem(key: string): string | null {
    const raw = this.storage.getItem(this.scopedKey(key));
    if (raw === null) return null;
    if (!this.isSessionPayloadKey(key)) return raw;
    const decoded = decodeSessionEnvelope(raw);
    return decoded ? JSON.stringify(decoded.state) : raw;
  }

  setItem(key: string, value: string): void {
    if (!this.isSessionPayloadKey(key)) {
      this.storage.setItem(this.scopedKey(key), value);
      return;
    }

    const parsed = parseSessionState(value);
    if (!parsed) {
      // Preserve unknown payloads verbatim rather than dropping data.
      this.storage.setItem(this.scopedKey(key), value);
      return;
    }

    const envelope: SessionEnvelope = {
      schemaVersion: SESSION_SCHEMA_VERSION,
      revision: toRevision(parsed),
      state: parsed,
    };
    this.storage.setItem(this.scopedKey(key), JSON.stringify(envelope));
  }

  removeItem(key: string): void {
    this.storage.removeItem(this.scopedKey(key));
  }
}

function parseSessionState(value: string): ChatSessionState | null {
  try {
    return JSON.parse(value) as ChatSessionState;
  } catch {
    return null;
  }
}

function decodeSessionEnvelope(raw: string): SessionEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SessionEnvelope>;
    if (!parsed || parsed.schemaVersion !== SESSION_SCHEMA_VERSION || !parsed.state) return null;
    return parsed as SessionEnvelope;
  } catch {
    return null;
  }
}

function toScope(scope?: string): string {
  return (scope || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE;
}

function toRevision(state: ChatSessionState): string {
  return String(state.updatedAt || Date.now());
}

function toCursor(offset: number): string {
  return String(offset);
}

function parseCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  const n = Number.parseInt(cursor, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function storageSupportsIteration(storage: StorageBackend): storage is StorageBackend & { length: number; key(index: number): string | null } {
  return 'length' in storage && typeof (storage as { key?: unknown }).key === 'function';
}

function storageSupportsClear(storage: StorageBackend): storage is StorageBackend & { clear(): void } {
  return typeof (storage as { clear?: unknown }).clear === 'function';
}

export class LocalChatThreadRepository implements ChatThreadRepository {
  private readonly maxThreads: number;

  constructor(
    private readonly storage: StorageBackend,
    options: LocalChatThreadRepositoryOptions = {},
  ) {
    this.maxThreads = options.maxThreads ?? DEFAULT_MAX_THREADS;
  }

  async listThreads(input?: ListThreadsInput): Promise<ListThreadsResult> {
    const scope = toScope(input?.projectScope);
    this.migrateLegacyScopeIfNeeded(scope);
    const summaries = this.storeForScope(scope).list();
    const offset = parseCursor(input?.cursor);
    const limit = input?.limit && input.limit > 0 ? input.limit : summaries.length;
    const items = summaries.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const nextCursor = nextOffset < summaries.length ? toCursor(nextOffset) : null;
    return { items, nextCursor };
  }

  async loadThread(id: string, input?: LoadThreadInput): Promise<ChatSessionState | null> {
    const scope = toScope(input?.projectScope);
    this.migrateLegacyScopeIfNeeded(scope);
    return this.storeForScope(scope).load(id);
  }

  async saveThread(state: ChatSessionState, input?: SaveThreadInput): Promise<SaveThreadResult> {
    const scope = toScope(input?.projectScope);
    this.migrateLegacyScopeIfNeeded(scope);
    const store = this.storeForScope(scope);

    if (input?.expectedRevision) {
      const existing = store.load(state.id);
      if (existing && toRevision(existing) !== input.expectedRevision) {
        throw new Error('Thread revision conflict.');
      }
    }

    store.save(state);
    this.trimToMaxThreads(store);
    return { revision: toRevision(state) };
  }

  async deleteThread(id: string, input?: LoadThreadInput): Promise<void> {
    const scope = toScope(input?.projectScope);
    this.migrateLegacyScopeIfNeeded(scope);
    this.storeForScope(scope).delete(id);
  }

  async clearThreads(input?: ClearThreadsInput): Promise<void> {
    const scope = toScope(input?.projectScope);
    this.migrateLegacyScopeIfNeeded(scope);
    const store = this.storeForScope(scope);
    for (const summary of store.list()) {
      store.delete(summary.id);
    }
  }

  private storeForScope(scope: string): SessionStore {
    return new SessionStore(new ScopedSessionStorageBackend(this.storage, scope));
  }

  private trimToMaxThreads(store: SessionStore): void {
    const summaries = store.list();
    if (summaries.length <= this.maxThreads) return;
    for (const summary of summaries.slice(this.maxThreads)) {
      store.delete(summary.id);
    }
  }

  private migrateLegacyScopeIfNeeded(scope: string): void {
    if (scope !== DEFAULT_SCOPE) return;
    // Migrate only once per scope and only when scoped index is absent.
    const migrationFlag = `${MIGRATION_FLAG_PREFIX}${scope}`;
    if (this.storage.getItem(migrationFlag) === '1') return;

    const scopedIndexKey = `${STORAGE_SCOPE_PREFIX}${scope}:${SESSION_INDEX_KEY}`;
    const hasScopedIndex = this.storage.getItem(scopedIndexKey) !== null;
    if (hasScopedIndex) {
      this.storage.setItem(migrationFlag, '1');
      return;
    }

    const legacyIndexRaw = this.storage.getItem(SESSION_INDEX_KEY);
    if (!legacyIndexRaw) {
      this.storage.setItem(migrationFlag, '1');
      return;
    }

    let legacyIds: string[] = [];
    try {
      legacyIds = JSON.parse(legacyIndexRaw) as string[];
    } catch {
      this.storage.setItem(migrationFlag, '1');
      return;
    }

    this.storage.setItem(scopedIndexKey, legacyIndexRaw);
    for (const id of legacyIds) {
      const legacyKey = `${SESSION_KEY_PREFIX}${id}`;
      const scopedKey = `${STORAGE_SCOPE_PREFIX}${scope}:${legacyKey}`;
      const existing = this.storage.getItem(scopedKey);
      if (existing !== null) continue;
      const legacy = this.storage.getItem(legacyKey);
      if (legacy !== null) this.storage.setItem(scopedKey, legacy);
    }

    this.storage.setItem(migrationFlag, '1');
  }
}

export function createLocalChatThreadRepository(storage?: StorageBackend, options?: LocalChatThreadRepositoryOptions): ChatThreadRepository {
  if (storage) return new LocalChatThreadRepository(storage, options);
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalChatThreadRepository(window.localStorage, options);
  }
  // Test/server fallback that keeps API available without crashing.
  const map = new Map<string, string>();
  const memoryStorage: StorageBackend = {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
  return new LocalChatThreadRepository(memoryStorage, options);
}

export function deriveChatProjectScope(project: { definition?: { id?: unknown; title?: unknown } }): string {
  const definitionId = typeof project.definition?.id === 'string' ? project.definition.id.trim() : '';
  if (definitionId) return `definition:${definitionId}`;
  const title = typeof project.definition?.title === 'string' ? project.definition.title.trim() : '';
  return title ? `title:${title.toLowerCase()}` : DEFAULT_SCOPE;
}

export function clearAllLocalChatThreadScopes(storage: StorageBackend): void {
  // Helper primarily for tests: clear all scoped keys created by this adapter.
  if (!storageSupportsIteration(storage)) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(STORAGE_SCOPE_PREFIX)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  if (storageSupportsClear(storage)) {
    const migrationKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(MIGRATION_FLAG_PREFIX)) migrationKeys.push(key);
    }
    for (const key of migrationKeys) storage.removeItem(key);
  }
}
