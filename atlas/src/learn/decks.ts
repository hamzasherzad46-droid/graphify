import type { Bone } from '../data/types'
import { bonesIn, nameKey } from './pool'

/** Flashcard deck listing (no scheduler, so Home can count cards without loading FSRS). */
export type Direction = 'see' | 'find'
export interface DeckCard {
  id: string
  dir: Direction
  bones: Bone[] // every bone with this name (left and right)
}

export function deckFor(area: string): DeckCard[] {
  const byName = new Map<string, Bone[]>()
  for (const b of bonesIn(area)) byName.set(nameKey(b), [...(byName.get(nameKey(b)) ?? []), b])
  return [...byName.entries()].flatMap(([key, bones]) => (['see', 'find'] as const).map((dir) => ({ id: `${dir}:${key}`, dir, bones })))
}
