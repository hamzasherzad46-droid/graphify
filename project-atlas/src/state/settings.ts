import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Track } from '../content/types'
import { appStorage, STORAGE_KEYS } from '../lib/storage'

export type { Track }
export type ThemePref = 'light' | 'dark' | 'system'
export type QuizMode = 'learn' | 'hard'
export type Lang = 'en' | 'fr' | 'de' | 'ar' | 'ru' | 'zh' | 'ko'
export const LANGS: Lang[] = ['en', 'fr', 'de', 'ar', 'ru', 'zh', 'ko']
/** Seconds per question; 0 = off. */
export const ANSWER_TIMERS = [0, 30, 20, 10] as const
export const DAILY_GOALS = [10, 20, 40, 60] as const

export interface LastSession {
  moduleId: string
  region: string | null
  mode: QuizMode
}

interface SettingsState {
  theme: ThemePref
  track: Track
  lang: Lang
  name: string
  sound: boolean
  dailyGoal: number
  answerTimer: number
  onboarded: boolean
  lastSession: LastSession | null
  set(patch: Partial<Omit<SettingsState, 'set'>>): void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      track: 'nursing',
      lang: 'en',
      name: '',
      sound: true,
      dailyGoal: 20,
      answerTimer: 0,
      onboarded: false,
      lastSession: null,
      set: (patch) => set(patch),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => appStorage),
      version: 2,
      migrate: (old, version) => {
        const s = (old ?? {}) as Record<string, unknown>
        // v1 had no onboarding; v1 users already chose a track, so skip it. The redesign defaults to the paper theme.
        if (version < 2) return { ...s, theme: 'light', lang: 'en', name: '', dailyGoal: 20, answerTimer: 0, onboarded: true }
        return s
      },
    },
  ),
)

/** Resolve "system", write data-theme, lang and dir on <html>. Returns an unsubscribe function. */
export function applyTheme(pref: ThemePref): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => {
    const theme = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#efeadf' : '#121417')
  }
  apply()
  if (pref !== 'system') return () => {}
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}
