import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import type { StoredCard } from '../state/progress'
import { shuffle } from './pool'
import { deckFor, type DeckCard } from './decks'

export { deckFor, type DeckCard, type Direction } from './decks'

/**
 * Flashcards, scheduled with FSRS (ts-fsrs, default parameters). Two cards per bone name:
 *   see  — the bone lights up on the model; recall its name
 *   find — the name is shown; tap the bone on the model
 */
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))
export const GRADES: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Again' },
  { grade: Rating.Hard, label: 'Hard' },
  { grade: Rating.Good, label: 'Good' },
  { grade: Rating.Easy, label: 'Easy' },
]

export const toCard = (s: StoredCard): Card =>
  ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined }) as Card
export const fromCard = (c: Card): StoredCard => ({
  due: c.due.toISOString(),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  last_review: c.last_review?.toISOString(),
})

/** Today's queue: due cards (earliest first), then up to `newLeft` new cards, the two directions interleaved. */
export function queue(area: string, stored: Record<string, StoredCard>, newLeft: number, now = new Date()): DeckCard[] {
  const deck = deckFor(area)
  const due = deck.filter((c) => stored[c.id] && new Date(stored[c.id].due) <= now).sort((a, b) => stored[a.id].due.localeCompare(stored[b.id].due))
  // New cards: "see" before "find" for the same bone, so a bone is met before it must be found.
  const fresh = shuffle(deck.filter((c) => !stored[c.id] && c.dir === 'see'))
  const newCards: DeckCard[] = []
  for (const c of fresh) {
    if (newCards.length >= newLeft) break
    newCards.push(c)
  }
  const finds = deck.filter((c) => !stored[c.id] && c.dir === 'find' && stored[`see:${c.id.slice(5)}`])
  for (const c of finds) if (newCards.length < newLeft) newCards.push(c)
  return [...due, ...newCards]
}

/** Next state of a card for a grade. */
export function review(stored: StoredCard | undefined, grade: Grade, now = new Date()): StoredCard {
  const card = stored ? toCard(stored) : createEmptyCard(now)
  return fromCard(scheduler.next(card, now, grade).card)
}

/** "<1 min", "10 min", "3 d", "2 mo" — when each grade would bring the card back. */
export function intervals(stored: StoredCard | undefined, now = new Date()): Record<number, string> {
  const card = stored ? toCard(stored) : createEmptyCard(now)
  const r = scheduler.repeat(card, now)
  const out: Record<number, string> = {}
  for (const { grade } of GRADES) out[grade] = formatInterval(r[grade].card.due.getTime() - now.getTime())
  return out
}

export function formatInterval(ms: number): string {
  const min = ms / 60000
  if (min < 1) return '<1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = min / 60
  if (h < 24) return `${Math.round(h)} h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)} d`
  if (d < 365) return `${Math.round(d / 30)} mo`
  return `${(d / 365).toFixed(1)} y`
}
