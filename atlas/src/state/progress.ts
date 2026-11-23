import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import type { BoneStat } from '../learn/weak'

/** An FSRS card as stored (dates as ISO strings). */
export interface StoredCard {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string
}

export interface SessionRecord {
  mode: 'typing' | 'quiz' | 'weak' | 'flashcards'
  area: string
  answered: number
  correct: number
  ms: number
  at: string // ISO time
}

export const today = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

interface ProgressState {
  /** Per bone id, every mode: how often answered and how often right. */
  stats: Record<string, BoneStat>
  /** Days with any study (YYYY-MM-DD), for the streak. */
  days: string[]
  /** Answers and reviews per day (YYYY-MM-DD → count), for the heat map. */
  daily: Record<string, number>
  /** FSRS flashcards by card id. */
  cards: Record<string, StoredCard>
  /** New flashcards introduced today. */
  newToday: { date: string; count: number }
  /** Finished study sessions, newest last (kept to the last 200). */
  sessions: SessionRecord[]
  addSession: (s: SessionRecord) => void
  record: (boneId: string, correct: boolean) => void
  saveCard: (id: string, card: StoredCard, wasNew: boolean) => void
  reset: () => void
}

/** Saved on this device (cloud sync later goes through appStorage). */
export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      stats: {},
      days: [],
      daily: {},
      cards: {},
      newToday: { date: '', count: 0 },
      sessions: [],
      addSession: (rec) => set((s) => ({ sessions: [...s.sessions, rec].slice(-200) })),
      record: (boneId, correct) =>
        set((s) => {
          const d = today()
          const prev = s.stats[boneId] ?? { seen: 0, correct: 0, last: d }
          const recent = ((prev.recent ?? '') + (correct ? '1' : '0')).slice(-10)
          return {
            stats: { ...s.stats, [boneId]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0), last: new Date().toISOString(), recent } },
            days: s.days.includes(d) ? s.days : [...s.days, d],
            daily: { ...s.daily, [d]: (s.daily[d] ?? 0) + 1 },
          }
        }),
      saveCard: (id, card, wasNew) =>
        set((s) => {
          const d = today()
          const count = (s.newToday.date === d ? s.newToday.count : 0) + (wasNew ? 1 : 0)
          return { cards: { ...s.cards, [id]: card }, newToday: { date: d, count }, days: s.days.includes(d) ? s.days : [...s.days, d] }
        }),
      reset: () => set({ stats: {}, days: [], daily: {}, cards: {}, newToday: { date: '', count: 0 }, sessions: [] }),
    }),
    { name: 'atlas.progress.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
