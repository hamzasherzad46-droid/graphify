import type { Structure } from '../content/types'
import type { CardRecord } from '../state/progress'

/** Due cards first, then unseen (easiest first), then the rest by lowest box. */
export function buildDeck(structures: Structure[], cards: Record<string, CardRecord>, n: number, now = Date.now()): string[] {
  const score = (s: Structure) => {
    const c = cards[s.id]
    if (c && c.dueAt <= now) return c.dueAt - now - 1e12
    if (!c) return s.difficulty * 1000 + Math.random() * 10
    return 1e6 + c.box * 1000 + Math.random() * 10
  }
  return [...structures].sort((a, b) => score(a) - score(b)).slice(0, n).map((s) => s.id)
}
