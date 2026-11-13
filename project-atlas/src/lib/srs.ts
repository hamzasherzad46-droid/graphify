/**
 * Simple spaced repetition (Leitner boxes).
 * Perfect answers move an item up a box (longer interval); mistakes move it down;
 * skips send it back to box 0. Box >= MASTERED_BOX counts as mastered.
 */

export type Outcome = 'perfect' | 'ok' | 'failed'

export interface StructureRecord {
  attempts: number
  /** Answers completed with no errors or hints. */
  correct: number
  /** Wrong keystrokes + hints + skips, summed over all attempts. */
  errors: number
  lastSeen: number
  lastOutcome: Outcome
  box: number
  dueAt: number
  /** First time the item reached the mastered box. */
  masteredAt?: number
}

export const MASTERED_BOX = 4
const MIN = 60_000
const DAY = 24 * 60 * MIN
/** Interval per box. */
export const INTERVALS = [0, 10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 21 * DAY]

export function outcomeFor(errors: number, skipped: boolean): Outcome {
  if (skipped) return 'failed'
  return errors === 0 ? 'perfect' : 'ok'
}

export function updateRecord(prev: StructureRecord | undefined, outcome: Outcome, errors: number, now: number): StructureRecord {
  const box0 = prev?.box ?? 0
  const box =
    outcome === 'perfect' ? Math.min(box0 + 1, INTERVALS.length - 1) : outcome === 'ok' ? Math.max(box0 - 1, 0) : 0
  return {
    attempts: (prev?.attempts ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (outcome === 'perfect' ? 1 : 0),
    errors: (prev?.errors ?? 0) + errors + (outcome === 'failed' ? 1 : 0),
    lastSeen: now,
    lastOutcome: outcome,
    box,
    dueAt: now + INTERVALS[box],
    masteredAt: prev?.masteredAt ?? (box >= MASTERED_BOX ? now : undefined),
  }
}

export function isMastered(r: StructureRecord | undefined): boolean {
  return !!r && r.box >= MASTERED_BOX
}

/**
 * Still needs review: has been missed and not yet consolidated. A miss drops the
 * item to box 0 (skip) or down one box (errors); two perfect answers in a row
 * (box >= 2) clear it, so a single lucky retry in the same session doesn't.
 */
export function isMissed(r: StructureRecord | undefined): boolean {
  return !!r && r.correct < r.attempts && r.box < 2
}

/**
 * Order items for a practice session: overdue first (most overdue first),
 * then unseen items (easier first), then not-yet-due items by lowest box.
 * Mastered items that are not due come last, so they appear less often.
 */
export function prioritise<T extends { id: string; difficulty: number }>(
  items: T[],
  records: Record<string, StructureRecord>,
  now: number,
  random: () => number = Math.random,
): T[] {
  const jitter = new Map(items.map((i) => [i.id, random()]))
  const score = (i: T): number => {
    const r = records[i.id]
    if (!r) return 1_000 + i.difficulty * 10 + jitter.get(i.id)! // unseen
    if (r.dueAt <= now) return (r.dueAt - now) / DAY + jitter.get(i.id)! * 0.01 // overdue: negative
    return 2_000 + r.box * 100 + jitter.get(i.id)! * 10
  }
  return [...items].sort((a, b) => score(a) - score(b))
}

/** Within a session, an item answered imperfectly comes back this many questions later. */
export const REQUEUE_GAP = 4

export function requeue(queue: string[], index: number, id: string): string[] {
  const at = Math.min(index + 1 + REQUEUE_GAP, queue.length)
  const next = [...queue]
  next.splice(at, 0, id)
  return next
}
