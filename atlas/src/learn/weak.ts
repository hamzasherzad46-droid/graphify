export interface BoneStat {
  seen: number
  correct: number
  last: string // ISO date of the last answer
  /** Most recent answers, oldest first: '1' right, '0' wrong (up to 10). */
  recent?: string
}

/** Error rate with a little smoothing, so one miss out of one doesn't outrank four out of five. */
export const weakness = (s: BoneStat) => (s.seen - s.correct + 1) / (s.seen + 2)

/** Bones the student has got wrong at least once, weakest first. */
export function weakest(stats: Record<string, BoneStat>, n: number): string[] {
  return Object.entries(stats)
    .filter(([, s]) => s.correct < s.seen)
    .sort((a, b) => weakness(b[1]) - weakness(a[1]) || b[1].last.localeCompare(a[1].last))
    .slice(0, n)
    .map(([id]) => id)
}
