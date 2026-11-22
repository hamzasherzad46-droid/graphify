import { BONE_BY_ID } from '../data/bones'
import { useProgress } from '../state/progress'
import { pickBones, shuffle } from './pool'
import { weakest } from './weak'
import type { Item, Kind, Mode } from './session'

/** Builds the questions for a session. */
export function buildItems(mode: Exclude<Mode, 'flashcards'>, area: string, count: number): Item[] {
  if (mode === 'typing') return pickBones(area, count).map((bone) => ({ bone, kind: 'type' as Kind }))
  if (mode === 'quiz') return pickBones(area, count).map((bone, i) => ({ bone, kind: (i % 2 ? 'tap' : 'choice') as Kind }))
  // Weak Bones: the most-missed bones, question types interleaved (not one type at a time).
  const ids = weakest(useProgress.getState().stats, count || 20)
  const kinds: Kind[] = ['type', 'choice', 'tap']
  return shuffle(ids.map((id) => BONE_BY_ID.get(id)!).filter(Boolean)).map((bone, i) => ({ bone, kind: kinds[i % 3] }))
}

