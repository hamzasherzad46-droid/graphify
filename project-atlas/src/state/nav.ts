import { create } from 'zustand'
import type { QuizMode } from './settings'

export type Tab = 'today' | 'atlas' | 'practice' | 'progress' | 'you'

export type SessionKind = 'practice' | 'review' | 'assessment'

export interface SessionConfig {
  kind: SessionKind
  moduleId: string
  mode: QuizMode
  region: string | null
  /** Explicit structure ids (review mistakes); otherwise chosen by spaced repetition. */
  ids?: string[]
  length: number
  /** Whole-test time limit (exam). */
  timeLimitMs?: number
  /** Per-question time limit in seconds; 0 = none. */
  answerTimer: number
  /** Only structures of this difficulty (1 foundation, 2 intermediate, 3 advanced); null = all. */
  tier?: number | null
}

export interface CardsConfig {
  moduleId: string
  region: string | null
  ids?: string[]
}

interface NavState {
  tab: Tab
  session: SessionConfig | null
  cards: CardsConfig | null
  /** Module detail page (inside the Atlas tab). */
  modulePage: string | null
  /** Full-screen 3D explore for a module. */
  explore: string | null
  credits: boolean
  setTab(tab: Tab): void
  startSession(config: SessionConfig): void
  endSession(): void
  startCards(config: CardsConfig): void
  endCards(): void
  openModule(id: string | null): void
  openExplore(id: string | null): void
  setCredits(open: boolean): void
}

export const useNav = create<NavState>()((set) => ({
  tab: 'today',
  session: null,
  cards: null,
  modulePage: null,
  explore: null,
  credits: false,
  setTab: (tab) => set({ tab, modulePage: null }),
  startSession: (session) => set({ session, cards: null }),
  endSession: () => set({ session: null }),
  startCards: (cards) => set({ cards, session: null }),
  endCards: () => set({ cards: null }),
  openModule: (modulePage) => set({ modulePage, tab: 'atlas' }),
  openExplore: (explore) => set({ explore }),
  setCredits: (credits) => set({ credits }),
}))

export const PRACTICE_LENGTH = 12
export const CARDS_LENGTH = 15
export const ASSESSMENT_LENGTH = 20
export const ASSESSMENT_TIME_MS = 5 * 60_000
/** Exams also give each question its own clock. */
export const ASSESSMENT_ANSWER_TIMER = 20
