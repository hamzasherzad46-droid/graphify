import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DayActivity } from '../lib/assignments'
import { dayKey } from '../lib/dates'
import { appStorage, STORAGE_KEYS } from '../lib/storage'
import { updateRecord, type Outcome, type StructureRecord } from '../lib/srs'

export { dayKey }
export type { DayActivity }

export interface AssessmentResult {
  at: number
  moduleId: string
  total: number
  correct: number
  durationMs: number
  missed: string[]
}

/** Flashcards use their own Leitner boxes so they don't inflate quiz mastery. */
export interface CardRecord {
  box: number
  dueAt: number
  seen: number
}

const CARD_INTERVALS = [0, 5 * 60_000, 24 * 3600_000, 3 * 24 * 3600_000, 7 * 24 * 3600_000, 21 * 24 * 3600_000]

interface ProgressState {
  records: Record<string, StructureRecord>
  cards: Record<string, CardRecord>
  days: Record<string, DayActivity>
  assessments: AssessmentResult[]
  xp: number
  /** Assignment instance key → time claimed. */
  claimed: Record<string, number>
  record(a: { id: string; moduleId: string; outcome: Outcome; errors: number; ms: number; xp: number; combo: number }): void
  recordCard(id: string, moduleId: string, known: boolean): void
  addAssessment(result: AssessmentResult): void
  claim(key: string, xp: number): void
  reset(): void
}

const emptyDay = (): DayActivity => ({ answered: 0, correct: 0, ms: 0, cards: 0, xp: 0, bestCombo: 0, modules: [] })

function withDay(days: Record<string, DayActivity>, moduleId: string | null, f: (d: DayActivity) => Partial<DayActivity>) {
  const key = dayKey()
  const d = { ...emptyDay(), ...days[key] }
  const modules = moduleId && !d.modules.includes(moduleId) ? [...d.modules, moduleId] : d.modules
  return { ...days, [key]: { ...d, ...f(d), modules } }
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      records: {},
      cards: {},
      days: {},
      assessments: [],
      xp: 0,
      claimed: {},
      record: ({ id, moduleId, outcome, errors, ms, xp, combo }) =>
        set((s) => ({
          records: { ...s.records, [id]: updateRecord(s.records[id], outcome, errors, Date.now()) },
          xp: s.xp + xp,
          days: withDay(s.days, moduleId, (d) => ({
            answered: d.answered + 1,
            correct: d.correct + (outcome === 'perfect' ? 1 : 0),
            ms: d.ms + ms,
            xp: d.xp + xp,
            bestCombo: Math.max(d.bestCombo, combo),
          })),
        })),
      recordCard: (id, moduleId, known) =>
        set((s) => {
          const prev = s.cards[id]
          const box = known ? Math.min((prev?.box ?? 0) + 1, CARD_INTERVALS.length - 1) : 0
          const xp = known ? 2 : 1
          return {
            cards: { ...s.cards, [id]: { box, dueAt: Date.now() + CARD_INTERVALS[box], seen: (prev?.seen ?? 0) + 1 } },
            xp: s.xp + xp,
            days: withDay(s.days, moduleId, (d) => ({ cards: d.cards + 1, xp: d.xp + xp })),
          }
        }),
      addAssessment: (result) => set((s) => ({ assessments: [result, ...s.assessments].slice(0, 50) })),
      claim: (key, xp) =>
        set((s) =>
          s.claimed[key] ? s : { claimed: { ...s.claimed, [key]: Date.now() }, xp: s.xp + xp, days: withDay(s.days, null, (d) => ({ xp: d.xp + xp })) },
        ),
      reset: () => set({ records: {}, cards: {}, days: {}, assessments: [], xp: 0, claimed: {} }),
    }),
    {
      name: STORAGE_KEYS.progress,
      storage: createJSONStorage(() => appStorage),
      version: 2,
      migrate: (old, version) => {
        const s = (old ?? {}) as Record<string, unknown>
        if (version < 2) {
          const days = Object.fromEntries(
            Object.entries((s.days ?? {}) as Record<string, Partial<DayActivity>>).map(([k, d]) => [k, { ...emptyDay(), ...d }]),
          )
          return { ...s, days, cards: {}, xp: 0, claimed: {} }
        }
        return s
      },
    },
  ),
)
