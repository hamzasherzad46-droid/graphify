/**
 * Storage interface. All persisted state goes through `appStorage`.
 * Today it is localStorage; a backend implementation only has to provide
 * these three methods (sync or async) and be swapped in here.
 */
export interface KeyValueStore {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

class LocalKeyValueStore implements KeyValueStore {
  private memory = new Map<string, string>()

  private get ls(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null
    } catch {
      return null // Safari private mode / disabled storage
    }
  }

  getItem(key: string) {
    return this.ls?.getItem(key) ?? this.memory.get(key) ?? null
  }

  setItem(key: string, value: string) {
    try {
      this.ls?.setItem(key, value)
    } catch {
      /* quota exceeded: fall back to memory for this session */
    }
    this.memory.set(key, value)
  }

  removeItem(key: string) {
    this.ls?.removeItem(key)
    this.memory.delete(key)
  }
}

export const appStorage: KeyValueStore = new LocalKeyValueStore()

export const STORAGE_KEYS = {
  settings: 'atlas:settings:v1',
  progress: 'atlas:progress:v1',
} as const
