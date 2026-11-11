import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage, STORAGE_KEYS } from '../lib/storage'

export type ThemePref = 'dark' | 'light' | 'system'
export type Track = 'nursing' | 'medicine'
export type QuizMode = 'learn' | 'hard'

export interface LastSession {
  moduleId: string
  region: string | null
  mode: QuizMode
}

interface SettingsState {
  theme: ThemePref
  track: Track
  sound: boolean
  lastSession: LastSession | null
  setTheme(theme: ThemePref): void
  setTrack(track: Track): void
  setSound(sound: boolean): void
  setLastSession(s: LastSession): void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      track: 'nursing',
      sound: true,
      lastSession: null,
      setTheme: (theme) => set({ theme }),
      setTrack: (track) => set({ track }),
      setSound: (sound) => set({ sound }),
      setLastSession: (lastSession) => set({ lastSession }),
    }),
    { name: STORAGE_KEYS.settings, storage: createJSONStorage(() => appStorage), version: 1 },
  ),
)

/** Resolve "system" and write data-theme on <html>. Returns an unsubscribe function. */
export function applyTheme(pref: ThemePref): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const apply = () => {
    const theme = pref === 'system' ? (mq.matches ? 'light' : 'dark') : pref
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f5f2' : '#0b0b0d')
  }
  apply()
  if (pref !== 'system') return () => {}
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}
