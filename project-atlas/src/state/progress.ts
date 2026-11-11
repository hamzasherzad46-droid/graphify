import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage, STORAGE_KEYS } from '../lib/storage'
import { updateRecord, type Outcome, type StructureRecord } from '../lib/srs'

export interface DayActivity {
  answered: number
  correct: number
  ms: number
}

export interface AssessmentResult {
  at: number
  moduleId: string
  total: number
  correct: number
  durationMs: number
  missed: string[]
}

interface ProgressState {
  /** Keyed by structure id. */
  records: Record<string, StructureRecord>
  /** Keyed by local date, YYYY-MM-DD. */
  days: Record<string, DayActivity>
  assessments: AssessmentResult[]
  record(id: string, outcome: Outcome, errors: number, ms: number): void
  addAssessment(result: AssessmentResult): void
  reset(): void
}

export function dayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      records: {},
      days: {},
      assessments: [],
      record: (id, outcome, errors, ms) =>
        set((s) => {
          const key = dayKey()
          const day = s.days[key] ?? { answered: 0, correct: 0, ms: 0 }
          return {
            records: { ...s.records, [id]: updateRecord(s.records[id], outcome, errors, Date.now()) },
            days: {
              ...s.days,
              [key]: { answered: day.answered + 1, correct: day.correct + (outcome === 'perfect' ? 1 : 0), ms: day.ms + ms },
            },
          }
        }),
      addAssessment: (result) => set((s) => ({ assessments: [result, ...s.assessments].slice(0, 20) })),
      reset: () => set({ records: {}, days: {}, assessments: [] }),
    }),
    { name: STORAGE_KEYS.progress, storage: createJSONStorage(() => appStorage), version: 1 },
  ),
)
