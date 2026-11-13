import type { Outcome } from './srs'

export interface XpContext {
  outcome: Outcome
  /** Consecutive perfect answers including this one. */
  combo: number
  hard: boolean
  timed: boolean
  difficulty: number
}

/** Combo multiplier shown in the quiz: x1, x1.5 from 3 in a row, x2 from 6, x3 from 10. */
export function comboMultiplier(combo: number): number {
  return combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1
}

export function xpForAnswer({ outcome, combo, hard, timed, difficulty }: XpContext): number {
  if (outcome === 'failed') return 0
  const base = outcome === 'perfect' ? 10 : 4
  const mult = (hard ? 1.5 : 1) * (timed ? 1.25 : 1) * (1 + (difficulty - 1) * 0.25) * (outcome === 'perfect' ? comboMultiplier(combo) : 1)
  return Math.round(base * mult)
}

/** Total XP needed to reach a level: L2 at 100, L3 at 300, L4 at 600, L5 at 1000, … */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export interface LevelInfo {
  level: number
  /** XP into the current level and the size of the level. */
  into: number
  span: number
  title: LevelTitle
}

export type LevelTitle = 'firstYear' | 'student' | 'demonstrator' | 'prosector' | 'lecturer' | 'seniorLecturer' | 'professor'

const TITLES: [number, LevelTitle][] = [
  [20, 'professor'],
  [16, 'seniorLecturer'],
  [12, 'lecturer'],
  [8, 'prosector'],
  [5, 'demonstrator'],
  [3, 'student'],
  [1, 'firstYear'],
]

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const start = xpForLevel(level)
  return {
    level,
    into: xp - start,
    span: xpForLevel(level + 1) - start,
    title: TITLES.find(([min]) => level >= min)![1],
  }
}
