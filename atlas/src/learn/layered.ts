/**
 * Layered flashcards: one question on the front; on the back the answer, then layers the student opens as deep as
 * they want: Why, Go deeper (distinction depth), Clinical, and extras (memory hook, exam trap, See in 3D, source).
 *
 * Content: content/cards/<topic>.json. Every statement carries its sources: OpenStax A&P 2e paragraphs
 * ("<section>#<paragraph id>"), and/or `check`, saying exactly what still needs an approved source. A card with any
 * `check` needs review; nothing unsourced is ever presented as verified.
 */

export type CardLevel = 'core' | 'higher' | 'distinction'
export type CardType = 'identify' | 'feature' | 'relation' | 'supply' | 'function' | 'clinical' | 'compare' | 'reverse'

export interface Fact {
  t: string
  /** OpenStax A&P 2e paragraphs, as "<section id>#<paragraph id>". */
  src: string[]
  /** What still needs an approved source (absent when every part of `t` is in `src`). */
  check?: string
}

export interface LayeredCard {
  id: string
  topic: string
  type: CardType
  level: CardLevel
  /** The structure the card is about (a slug: 'scaphoid', 'pterion', 'ulnar-nerve'). */
  structureId: string
  /** The Atlas bone for the 3D view and "See in 3D". */
  bone: string
  /** Show the bone on the front (only where it does not give the answer away). */
  frontView: boolean
  /** Front 3D view: degrees above the bone to look from. */
  elevation?: number
  /** The single learning objective (also how duplicates are found). */
  objective: string
  front: string
  answer: string
  why: Fact
  /** "Explain simpler": the Why in plainer words, from the same sources. */
  simpler?: Fact
  /** Distinction depth: at most five one-line points. */
  depth: Fact[]
  clinical: Fact
  hook?: Fact
  trap: Fact
  source: string
  reviewStatus: 'draft' | 'reviewed'
}

export const LEVELS: CardLevel[] = ['core', 'higher', 'distinction']
export const LEVEL_NAME: Record<CardLevel, string> = { core: 'Core', higher: 'Higher', distinction: 'Distinction' }
export const LEVEL_BLURB: Record<CardLevel, string> = {
  core: 'What every student must know to pass.',
  higher: 'What gets a good grade.',
  distinction: 'The depth that earns top marks.',
}
export const TYPE_NAME: Record<CardType, string> = {
  identify: 'Identify',
  feature: 'Feature',
  relation: 'Relation',
  supply: 'Supply',
  function: 'Function',
  clinical: 'Clinical',
  compare: 'Compare',
  reverse: 'Reverse',
}

const files = import.meta.glob<{ topic: string; cards: LayeredCard[] }>('../../content/cards/*.json', { import: 'default', eager: true })
export const LAYERED: LayeredCard[] = Object.values(files).flatMap((f) => f.cards)
export const layeredById = (id: string) => LAYERED.find((c) => c.id === id)

/** Every statement on a card, in reading order. */
export const factsOf = (c: LayeredCard): Fact[] => [c.why, ...(c.simpler ? [c.simpler] : []), ...c.depth, c.clinical, ...(c.hook ? [c.hook] : []), c.trap]

/** What still needs an approved source on this card (empty when every statement is sourced). */
export const needsReview = (c: LayeredCard): string[] => factsOf(c).flatMap((f) => (f.check ? [f.check] : []))

/** Scheduler key (FSRS state in the progress store). */
export const layeredKey = (c: LayeredCard) => `lc:${c.id}`

/** The text of each part of the back, keyed by the paragraph id used for highlights and notes. */
export function layeredParagraphs(c: LayeredCard): Map<string, string> {
  const m = new Map<string, string>()
  m.set(`${c.id}-answer`, c.answer)
  m.set(`${c.id}-why`, c.why.t)
  if (c.simpler) m.set(`${c.id}-simpler`, c.simpler.t)
  c.depth.forEach((d, k) => m.set(`${c.id}-depth-${k}`, d.t))
  m.set(`${c.id}-clinical`, c.clinical.t)
  if (c.hook) m.set(`${c.id}-hook`, c.hook.t)
  m.set(`${c.id}-trap`, c.trap.t)
  return m
}
