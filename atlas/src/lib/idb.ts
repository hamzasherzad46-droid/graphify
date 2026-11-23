/**
 * A very small IndexedDB key–value store (one database, one object store keyed by `id`).
 * Falls back to an in-memory map where IndexedDB is unavailable (private modes of old browsers).
 */
const DB = 'atlas'
const VERSION = 1
export const STORES = ['annotations'] as const
export type StoreName = (typeof STORES)[number]

let dbp: Promise<IDBDatabase | null> | null = null
function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VERSION)
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbp
}

const memory = new Map<string, Map<string, unknown>>()
const mem = (s: StoreName) => memory.get(s) ?? memory.set(s, new Map()).get(s)!

/** Write records; resolves when the transaction has committed. */
export async function putAll<T extends { id: string }>(store: StoreName, items: T[]): Promise<void> {
  const d = await db()
  if (!d) {
    for (const it of items) mem(store).set(it.id, it)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite', { durability: 'strict' } as IDBTransactionOptions)
    for (const it of items) tx.objectStore(store).put(it)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const d = await db()
  if (!d) return [...mem(store).values()] as T[]
  return new Promise<T[]>((resolve, reject) => {
    const req = d.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

/** Ask the browser not to evict this site's storage under pressure (granted silently for installed apps). */
export function persistStorage() {
  void navigator.storage?.persist?.().catch(() => {})
}
