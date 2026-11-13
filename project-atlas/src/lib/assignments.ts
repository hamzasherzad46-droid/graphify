import { daysInPeriodSoFar, periodEnd, periodKey, periodStart, type Period } from './dates'
import { isMastered, type StructureRecord } from './srs'

export interface DayActivity {
  answered: number
  correct: number
  ms: number
  /** Flashcards reviewed. */
  cards: number
  xp: number
  bestCombo: number
  /** Module ids practised that day. */
  modules: string[]
}

export interface ActivityInput {
  days: Record<string, DayActivity>
  records: Record<string, StructureRecord>
  assessments: { at: number; total: number; correct: number }[]
  dailyGoal: number
  systemOf: (moduleId: string) => string | undefined
}

/** Translation key suffix: `assignment.<id>`; `{n}` in the text is the target. */
export interface AssignmentTemplate {
  id: string
  period: Period
  xp: number
  target: (input: ActivityInput) => number
  measure: (input: ActivityInput, days: string[], from: number, to: number) => number
}

const sum = (input: ActivityInput, days: string[], f: (d: DayActivity) => number) =>
  days.reduce((n, k) => n + (input.days[k] ? f(input.days[k]) : 0), 0)
const activeDays = (input: ActivityInput, days: string[]) => days.filter((k) => (input.days[k]?.answered ?? 0) + (input.days[k]?.cards ?? 0) > 0).length
const masteredBetween = (input: ActivityInput, from: number, to: number) =>
  Object.values(input.records).filter((r) => isMastered(r) && r.masteredAt !== undefined && r.masteredAt >= from && r.masteredAt < to).length
const examsBetween = (input: ActivityInput, from: number, to: number, minPct = 0) =>
  input.assessments.filter((a) => a.at >= from && a.at < to && a.total > 0 && a.correct / a.total >= minPct).length

export const TEMPLATES: AssignmentTemplate[] = [
  // Day
  { id: 'dayGoal', period: 'day', xp: 30, target: (i) => i.dailyGoal, measure: (i, d) => sum(i, d, (x) => x.answered) },
  { id: 'dayCards', period: 'day', xp: 20, target: () => 10, measure: (i, d) => sum(i, d, (x) => x.cards) },
  { id: 'dayCombo', period: 'day', xp: 20, target: () => 5, measure: (i, d) => Math.max(0, ...d.map((k) => i.days[k]?.bestCombo ?? 0)) },
  // Week
  { id: 'weekDays', period: 'week', xp: 100, target: () => 5, measure: (i, d) => activeDays(i, d) },
  { id: 'weekMaster', period: 'week', xp: 120, target: () => 10, measure: (i, _d, from, to) => masteredBetween(i, from, to) },
  { id: 'weekExam', period: 'week', xp: 80, target: () => 1, measure: (i, _d, from, to) => examsBetween(i, from, to, 0.8) },
  { id: 'weekAnswers', period: 'week', xp: 80, target: () => 150, measure: (i, d) => sum(i, d, (x) => x.answered) },
  // Month
  { id: 'monthDays', period: 'month', xp: 400, target: () => 20, measure: (i, d) => activeDays(i, d) },
  { id: 'monthMaster', period: 'month', xp: 400, target: () => 40, measure: (i, _d, from, to) => masteredBetween(i, from, to) },
  {
    id: 'monthSystems',
    period: 'month',
    xp: 300,
    target: () => 3,
    measure: (i, d) => new Set(d.flatMap((k) => i.days[k]?.modules ?? []).map(i.systemOf).filter(Boolean)).size,
  },
  { id: 'monthExams', period: 'month', xp: 250, target: () => 4, measure: (i, _d, from, to) => examsBetween(i, from, to) },
]

export interface AssignmentStatus {
  id: string
  /** Unique per period instance, e.g. "dayGoal@day:2026-11-12"; used to award XP once. */
  key: string
  period: Period
  xp: number
  value: number
  target: number
  done: boolean
  /** Time left in the period, ms. */
  remainingMs: number
}

export function evaluateAssignments(input: ActivityInput, now = new Date()): AssignmentStatus[] {
  return TEMPLATES.map((t) => {
    const from = periodStart(t.period, now).getTime()
    const to = periodEnd(t.period, now).getTime()
    const target = t.target(input)
    const value = Math.min(target, t.measure(input, daysInPeriodSoFar(t.period, now), from, to))
    return {
      id: t.id,
      key: `${t.id}@${periodKey(t.period, now)}`,
      period: t.period,
      xp: t.xp,
      value,
      target,
      done: value >= target,
      remainingMs: to - now.getTime(),
    }
  })
}
