import { BONES, GROUPS } from '../data/bones'
import type { Bone } from '../data/types'
import { canon } from './answer'

export type Rng = () => number

export function shuffle<T>(xs: T[], rng: Rng = Math.random): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Study areas: the whole skeleton or a regions.json group. */
export const AREAS = [{ id: 'all', label: 'Whole skeleton' }, ...GROUPS.map((g) => ({ id: g.id, label: g.label }))]

export function bonesIn(area: string): Bone[] {
  if (area === 'all') return BONES
  const g = GROUPS.find((x) => x.id === area)
  if (!g) return BONES
  return BONES.filter((b) => g.regions.includes(b.region) || (g.bones ?? []).includes(b.id))
}

/** Same name = same answer (left and right femur). */
export const nameKey = (b: Bone) => canon(b.name)

/** Bones for a session: one per name (random side), shuffled, at most `count` (0 = all). */
export function pickBones(area: string, count: number, rng: Rng = Math.random): Bone[] {
  const byName = new Map<string, Bone[]>()
  for (const b of bonesIn(area)) byName.set(nameKey(b), [...(byName.get(nameKey(b)) ?? []), b])
  const one = [...byName.values()].map((list) => list[Math.floor(rng() * list.length)])
  const s = shuffle(one, rng)
  return count > 0 ? s.slice(0, count) : s
}

/** Three wrong options for a multiple-choice question: same subregion first, then same region, then anywhere. */
export function distractors(target: Bone, rng: Rng = Math.random): string[] {
  const key = nameKey(target)
  const names = (list: Bone[]) => [...new Set(list.filter((b) => nameKey(b) !== key).map((b) => b.name))]
  const tiers = [
    names(BONES.filter((b) => b.subregion && b.subregion === target.subregion)),
    names(BONES.filter((b) => b.region === target.region)),
    names(BONES),
  ]
  const out: string[] = []
  for (const tier of tiers) for (const n of shuffle(tier, rng)) if (out.length < 3 && !out.includes(n)) out.push(n)
  return out
}

/** "the left scaphoid" / "the sternum" — for prompts that need the side. */
export function withSide(b: Bone): string {
  return b.side === 'midline' ? b.name : `${b.name} (${b.side})`
}
