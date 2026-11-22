/**
 * Every persisted value goes through `appStorage`. Today it is localStorage (with an in-memory
 * fallback for private browsing); cloud sync later only has to implement this interface.
 */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

class LocalStore implements KeyValueStore {
  private memory = new Map<string, string>()
  private get ls(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null
    } catch {
      return null
    }
  }
  getItem(key: string) {
    try {
      return this.ls?.getItem(key) ?? this.memory.get(key) ?? null
    } catch {
      return this.memory.get(key) ?? null
    }
  }
  setItem(key: string, value: string) {
    this.memory.set(key, value)
    try {
      this.ls?.setItem(key, value)
    } catch {
      /* quota or disabled storage: memory only for this session */
    }
  }
  removeItem(key: string) {
    this.memory.delete(key)
    try {
      this.ls?.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

export const appStorage: KeyValueStore = new LocalStore()
