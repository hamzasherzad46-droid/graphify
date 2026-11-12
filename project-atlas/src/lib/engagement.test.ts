import { describe, expect, it } from 'vitest'
import { evaluateAssignments, type ActivityInput, type DayActivity } from './assignments'
import { dayKey, periodKey } from './dates'
import { currentStreak, weekStrip } from './streak'
import { comboMultiplier, levelFromXp, xpForAnswer, xpForLevel } from './xp'

const day = (over: Partial<DayActivity> = {}): DayActivity => ({ answered: 0, correct: 0, ms: 0, cards: 0, xp: 0, bestCombo: 0, modules: [], ...over })

describe('xp and levels', () => {
  it('rewards perfect answers, combos, hard and timed mode', () => {
    const base = { combo: 1, hard: false, timed: false, difficulty: 1 }
    expect(xpForAnswer({ ...base, outcome: 'perfect' })).toBe(10)
    expect(xpForAnswer({ ...base, outcome: 'ok' })).toBe(4)
    expect(xpForAnswer({ ...base, outcome: 'failed' })).toBe(0)
    expect(xpForAnswer({ ...base, outcome: 'perfect', combo: 6 })).toBe(20)
    expect(xpForAnswer({ ...base, outcome: 'perfect', hard: true, timed: true })).toBe(19)
    expect(comboMultiplier(10)).toBe(3)
  })

  it('levels follow the curve', () => {
    expect(xpForLevel(2)).toBe(100)
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, span: 100, title: 'firstYear' })
    expect(levelFromXp(350)).toMatchObject({ level: 3, into: 50, span: 300, title: 'student' })
    expect(levelFromXp(xpForLevel(20)).title).toBe('professor')
  })
})

describe('streaks', () => {
  const now = new Date(2026, 10, 12, 18) // Thu 12 Nov 2026
  const k = (d: number) => dayKey(new Date(2026, 10, d))
  it('counts back from today, or from yesterday before studying today', () => {
    expect(currentStreak(new Set([k(10), k(11), k(12)]), now)).toBe(3)
    expect(currentStreak(new Set([k(10), k(11)]), now)).toBe(2)
    expect(currentStreak(new Set([k(9), k(11)]), now)).toBe(1)
    expect(currentStreak(new Set(), now)).toBe(0)
  })
  it('builds a Monday-first week strip', () => {
    const strip = weekStrip(new Set([k(9), k(12)]), now)
    expect(strip.map((d) => d.key)[0]).toBe(k(9))
    expect(strip.filter((d) => d.active)).toHaveLength(2)
    expect(strip.find((d) => d.today)?.key).toBe(k(12))
    expect(strip.at(-1)?.future).toBe(true)
  })
})

describe('assignments', () => {
  const now = new Date(2026, 10, 12, 18)
  const input = (over: Partial<ActivityInput> = {}): ActivityInput => ({
    days: {},
    records: {},
    assessments: [],
    dailyGoal: 20,
    systemOf: (m) => ({ skeleton: 'skeletal', heart: 'cardiovascular' })[m],
    ...over,
  })

  it('daily goal uses the setting and completes', () => {
    const today = dayKey(now)
    const a = evaluateAssignments(input({ days: { [today]: day({ answered: 25 }) } }), now).find((x) => x.id === 'dayGoal')!
    expect(a).toMatchObject({ value: 20, target: 20, done: true, key: `dayGoal@${periodKey('day', now)}` })
  })

  it('weekly active days only count this week', () => {
    const days = Object.fromEntries([3, 9, 10, 11, 12].map((d) => [dayKey(new Date(2026, 10, d)), day({ answered: 1 })]))
    const a = evaluateAssignments(input({ days }), now).find((x) => x.id === 'weekDays')!
    expect(a.value).toBe(4) // the 3rd is last week
  })

  it('monthly systems counts distinct systems', () => {
    const days = { [dayKey(new Date(2026, 10, 2))]: day({ modules: ['skeleton', 'heart', 'unknown'] }) }
    expect(evaluateAssignments(input({ days }), now).find((x) => x.id === 'monthSystems')!.value).toBe(2)
  })
})
