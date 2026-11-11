import { create } from 'zustand'
import type { QuizMode } from './settings'

export type Tab = 'home' | 'courses' | 'explore' | 'practice' | 'assess' | 'progress' | 'profile'

export type SessionKind = 'practice' | 'review' | 'assessment'

export interface SessionConfig {
  kind: SessionKind
  moduleId: string
  mode: QuizMode
  region: string | null
  /** Explicit structure ids (review mistakes); otherwise chosen by spaced repetition. */
  ids?: string[]
  length: number
  /** Assessments only. */
  timeLimitMs?: number
}

interface NavState {
  tab: Tab
  session: SessionConfig | null
  credits: boolean
  setTab(tab: Tab): void
  startSession(config: SessionConfig): void
  endSession(): void
  setCredits(open: boolean): void
}

export const useNav = create<NavState>()((set) => ({
  tab: 'home',
  session: null,
  credits: false,
  setTab: (tab) => set({ tab }),
  startSession: (session) => set({ session }),
  endSession: () => set({ session: null }),
  setCredits: (credits) => set({ credits }),
}))

export const PRACTICE_LENGTH = 12
export const ASSESSMENT_LENGTH = 20
export const ASSESSMENT_TIME_MS = 5 * 60_000
