/** @filedesc Version-first artifact repository abstraction for AI authoring flows. */

export type VersionImpact = 'major' | 'minor' | 'patch';

export interface VersionRecord {
  id: string;
  scope: string;
  version: string;
  committedAt: string;
  summary?: string;
  semverImpact: VersionImpact;
  changelog: unknown;
  snapshot: unknown;
  sessionId?: string | null;
  /** Lineage when this commit was created as a fork of another version. */
  parentVersionId?: string | null;
}

export interface VersionListInput {
  scope: string;
}

export interface CommitVersionInput {
  scope: string;
  changelog: unknown;
  snapshot: unknown;
  summary?: string;
  sessionId?: string | null;
  parentVersionId?: string | null;
}

export interface VersionRepository {
  listVersions(input: VersionListInput): Promise<VersionRecord[]>;
  commitVersion(input: CommitVersionInput): Promise<VersionRecord>;
  restoreVersion(id: string, scope: string): Promise<VersionRecord | null>;
}

interface LocalVersionRepositoryOptions {
  maxVersions?: number;
}

interface VersionEnvelopeV1 {
  schemaVersion: 1;
  records: VersionRecord[];
}

const STORAGE_PREFIX = 'formspec-studio:versions:';
const DEFAULT_MAX_VERSIONS = 100;

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

function normalizeImpact(value: unknown): VersionImpact {
  if (value === 'major' || value === 'breaking') return 'major';
  if (value === 'minor' || value === 'compatible') return 'minor';
  return 'patch';
}

function nextVersion(previous: string | undefined, impact: VersionImpact): string {
  if (!previous) return impact === 'major' ? '1.0.0' : impact === 'minor' ? '0.1.0' : '0.0.1';
  const parts = previous.split('.').map((part) => Number.parseInt(part, 10));
  const [major, minor, patch] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  if (impact === 'major') return `${major + 1}.0.0`;
  if (impact === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function parseEnvelope(raw: string | null): VersionEnvelopeV1 {
  if (!raw) return { schemaVersion: 1, records: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<VersionEnvelopeV1>;
    if (parsed?.schemaVersion === 1 && Array.isArray(parsed.records)) {
      return { schemaVersion: 1, records: parsed.records as VersionRecord[] };
    }
  } catch {
    // Ignore malformed values and rebuild.
  }
  return { schemaVersion: 1, records: [] };
}

export class LocalVersionRepository implements VersionRepository {
  private readonly maxVersions: number;

  constructor(
    private readonly storage: Storage,
    options: LocalVersionRepositoryOptions = {},
  ) {
    this.maxVersions = options.maxVersions ?? DEFAULT_MAX_VERSIONS;
  }

  async listVersions(input: VersionListInput): Promise<VersionRecord[]> {
    const envelope = parseEnvelope(this.storage.getItem(storageKey(input.scope)));
    const indexed = envelope.records.map((record, index) => ({ record, index }));
    indexed.sort((a, b) => {
      const byTime = b.record.committedAt.localeCompare(a.record.committedAt);
      if (byTime !== 0) return byTime;
      return b.index - a.index;
    });
    return indexed.map((entry) => entry.record);
  }

  async commitVersion(input: CommitVersionInput): Promise<VersionRecord> {
    const key = storageKey(input.scope);
    const envelope = parseEnvelope(this.storage.getItem(key));
    const latest = envelope.records.at(-1);

    const semverImpact = normalizeImpact((input.changelog as { semverImpact?: unknown } | null | undefined)?.semverImpact);
    const record: VersionRecord = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope: input.scope,
      version: nextVersion(latest?.version, semverImpact),
      committedAt: new Date().toISOString(),
      summary: input.summary,
      semverImpact,
      changelog: input.changelog,
      snapshot: input.snapshot,
      sessionId: input.sessionId ?? null,
      parentVersionId: input.parentVersionId ?? null,
    };

    envelope.records.push(record);
    if (envelope.records.length > this.maxVersions) {
      envelope.records.splice(0, envelope.records.length - this.maxVersions);
    }
    this.storage.setItem(key, JSON.stringify(envelope));
    return record;
  }

  async restoreVersion(id: string, scope: string): Promise<VersionRecord | null> {
    const envelope = parseEnvelope(this.storage.getItem(storageKey(scope)));
    return envelope.records.find((record) => record.id === id) ?? null;
  }
}

export function createLocalVersionRepository(storage?: Storage, options?: LocalVersionRepositoryOptions): VersionRepository {
  if (storage) return new LocalVersionRepository(storage, options);
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalVersionRepository(window.localStorage, options);
  }
  const map = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
  return new LocalVersionRepository(memoryStorage, options);
}

/** Test helper: remove all `formspec-studio:versions:*` keys from storage. */
export function clearAllLocalVersionScopes(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
