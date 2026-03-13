type StoredRecord<T> = {
  key: string;
  value: T;
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

const memoryStorage = (() => {
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
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  } satisfies StorageLike;
})();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function storage(): StorageLike {
  const candidate = (typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage) as Partial<StorageLike> | undefined;
  if (
    candidate
    && typeof candidate.getItem === 'function'
    && typeof candidate.setItem === 'function'
    && typeof candidate.removeItem === 'function'
    && typeof candidate.key === 'function'
  ) {
    return candidate as StorageLike;
  }
  return memoryStorage;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function openDatabase(dbName: string, storeName: string): Promise<IDBDatabase> {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: 'key' });
    }
  };

  return requestToPromise(request);
}

export interface BrowserKVStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list<T>(prefix: string): Promise<Array<StoredRecord<T>>>;
}

export function createBrowserKVStore(
  dbName = 'formspec-studio',
  storeName = 'records',
  storagePrefix = 'formspec-studio:',
): BrowserKVStore {
  const localKey = (key: string) => `${storagePrefix}${key}`;

  if (!hasIndexedDb()) {
    const fallbackStorage = storage();
    return {
      async get<T>(key: string) {
        const raw = fallbackStorage.getItem(localKey(key));
        return raw ? (JSON.parse(raw) as T) : undefined;
      },
      async set<T>(key: string, value: T) {
        fallbackStorage.setItem(localKey(key), JSON.stringify(value));
      },
      async delete(key: string) {
        fallbackStorage.removeItem(localKey(key));
      },
      async list<T>(prefix: string) {
        const records: Array<StoredRecord<T>> = [];
        for (let index = 0; index < fallbackStorage.length; index += 1) {
          const key = fallbackStorage.key(index);
          if (!key || !key.startsWith(localKey(prefix))) continue;
          const raw = fallbackStorage.getItem(key);
          if (!raw) continue;
          records.push({
            key: key.slice(storagePrefix.length),
            value: JSON.parse(raw) as T,
          });
        }
        return records;
      },
    };
  }

  let dbPromise: Promise<IDBDatabase> | undefined;

  const database = () => {
    dbPromise ??= openDatabase(dbName, storeName);
    return dbPromise;
  };

  return {
    async get<T>(key: string) {
      const db = await database();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const record = await requestToPromise(store.get(key));
      return (record as StoredRecord<T> | undefined)?.value;
    },
    async set<T>(key: string, value: T) {
      const db = await database();
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put({ key, value });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      });
    },
    async delete(key: string) {
      const db = await database();
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      });
    },
    async list<T>(prefix: string) {
      const db = await database();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const records = await requestToPromise(store.getAll());
      return (records as Array<StoredRecord<T>>).filter((record) => record.key.startsWith(prefix));
    },
  };
}
