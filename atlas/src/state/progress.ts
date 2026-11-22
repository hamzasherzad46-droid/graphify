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

export const today = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

interface ProgressState {
  /** Per bone id, every mode: how often answered and how often right. */
  stats: Record<string, BoneStat>
  /** Days with any study (YYYY-MM-DD), for the streak. */
  days: string[]
  /** FSRS flashcards by card id. */
  cards: Record<string, StoredCard>
  /** New flashcards introduced today. */
  newToday: { date: string; count: number }
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
      cards: {},
      newToday: { date: '', count: 0 },
      record: (boneId, correct) =>
        set((s) => {
          const d = today()
          const prev = s.stats[boneId] ?? { seen: 0, correct: 0, last: d }
          return {
            stats: { ...s.stats, [boneId]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0), last: new Date().toISOString() } },
            days: s.days.includes(d) ? s.days : [...s.days, d],
          }
        }),
      saveCard: (id, card, wasNew) =>
        set((s) => {
          const d = today()
          const count = (s.newToday.date === d ? s.newToday.count : 0) + (wasNew ? 1 : 0)
          return { cards: { ...s.cards, [id]: card }, newToday: { date: d, count }, days: s.days.includes(d) ? s.days : [...s.days, d] }
        }),
      reset: () => set({ stats: {}, days: [], cards: {}, newToday: { date: '', count: 0 } }),
    }),
    { name: 'atlas.progress.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
