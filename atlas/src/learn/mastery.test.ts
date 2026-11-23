import { describe, expect, it } from 'vitest'
import { summarize, regionMastery, streak, heatmap, level, isMastered } from './mastery'
import type { BoneStat } from './weak'

const s = (seen: number, correct: number, recent: string, last = '2026-11-22T10:00:00Z'): BoneStat => ({ seen, correct, recent, last })

describe('mastery', () => {
  it('needs 3+ answers, the last 3 right and 80 % overall', () => {
    expect(isMastered({ seen: 3, correct: 3, recent: '111' })).toBe(true)
    expect(isMastered({ seen: 2, correct: 2, recent: '11' })).toBe(false)
    expect(isMastered({ seen: 5, correct: 4, recent: '10111' })).toBe(true)
    expect(isMastered({ seen: 5, correct: 3, recent: '00111' })).toBe(false) // 60 %
    expect(isMastered({ seen: 4, correct: 3, recent: '1110' })).toBe(false) // last answer wrong
  })
  it('pools left and right: mastering "Femur" counts both femurs', () => {
    const sum = summarize({ femur_left: s(2, 2, '11', '2026-11-20'), femur_right: s(1, 1, '1', '2026-11-22') })
    expect(sum.bonesMastered).toBe(2)
    expect(sum.bonesSeen).toBe(2)
    expect(sum.accuracy).toBe(1)
  })
  it('reports per-region mastery over all 206 bones', () => {
    const r = regionMastery({ femur_left: s(3, 3, '111') })
    expect(r.reduce((n, x) => n + x.total, 0)).toBe(206)
    expect(r.find((x) => x.label === 'Lower limb')).toMatchObject({ total: 8, mastered: 2 })
  })
})

describe('streak and heat map', () => {
  it('counts consecutive days, still alive if only yesterday is done', () => {
    expect(streak(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-22')).toEqual({ current: 3, longest: 3 })
    expect(streak(['2026-11-20', '2026-11-21'], '2026-11-22').current).toBe(2)
    expect(streak(['2026-11-19'], '2026-11-22').current).toBe(0)
    expect(streak(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-03', '2026-11-22'], '2026-11-22')).toEqual({ current: 1, longest: 3 })
  })
  it('lays out whole weeks, Monday first, with future days empty', () => {
    const h = heatmap({ '2026-11-22': 12 }, '2026-11-22', 15) // 2026-11-22 is a Sunday
    expect(h).toHaveLength(15)
    expect(h[14][6]).toEqual({ date: '2026-11-22', count: 12 })
    expect(h[14][0]!.date).toBe('2026-11-16')
    const h2 = heatmap({}, '2026-11-18', 2) // Wednesday
    expect(h2[1][3]).toBeNull()
  })
  it('maps counts to 5 levels', () => {
    expect([0, 1, 12, 30, 80].map(level)).toEqual([0, 1, 2, 3, 4])
  })
})
