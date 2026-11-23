import { BONES } from '../data/bones'
import type { Bone } from '../data/types'
import { nameKey } from './pool'
import type { BoneStat } from './weak'

/**
 * Progress maths. Answers are pooled by bone name (left and right femur share one name, so knowing one is
 * knowing both); counts of bones (mastered, seen) are over all 206 bone ids.
 *
 * A name is MASTERED when it has been answered at least 3 times, the last 3 answers were right, and overall
 * accuracy is at least 80 %.
 */
export interface NameStat {
  key: string
  name: string
  bones: Bone[]
  seen: number
  correct: number
  recent: string
  last: string
}

export function byName(stats: Record<string, BoneStat>): Map<string, NameStat> {
  const out = new Map<string, NameStat>()
  for (const b of BONES) {
    const k = nameKey(b)
    const e = out.get(k) ?? { key: k, name: b.name, bones: [], seen: 0, correct: 0, recent: '', last: '' }
    e.bones.push(b)
    const s = stats[b.id]
    if (s) {
      e.seen += s.seen
      e.correct += s.correct
      // Interleave by time is not recorded; take the most recently answered side's history last.
      e.recent = s.last >= e.last ? e.recent + (s.recent ?? '') : (s.recent ?? '') + e.recent
      if (s.last > e.last) e.last = s.last
    }
    out.set(k, e)
  }
  return out
}

export const isMastered = (n: { seen: number; correct: number; recent: string }) =>
  n.seen >= 3 && n.recent.slice(-3) === '111' && n.correct / n.seen >= 0.8

export interface Summary {
  bonesMastered: number
  bonesSeen: number
  answers: number
  accuracy: number | null // 0–1, null before any answer
}

export function summarize(stats: Record<string, BoneStat>): Summary {
  let answers = 0
  let correct = 0
  for (const s of Object.values(stats)) {
    answers += s.seen
    correct += s.correct
  }
  let bonesMastered = 0
  let bonesSeen = 0
  for (const n of byName(stats).values()) {
    if (n.seen > 0) bonesSeen += n.bones.length
    if (isMastered(n)) bonesMastered += n.bones.length
  }
  return { bonesMastered, bonesSeen, answers, accuracy: answers ? correct / answers : null }
}

/** Display regions for mastery: the content regions, with the hyoid (Neck) counted under the skull. */
export const MASTERY_REGIONS: { label: string; regions: string[] }[] = [
  { label: 'Skull and hyoid', regions: ['Skull', 'Neck'] },
  { label: 'Spine', regions: ['Vertebral column'] },
  { label: 'Thorax', regions: ['Thorax'] },
  { label: 'Upper limb', regions: ['Upper limb'] },
  { label: 'Hand', regions: ['Hand'] },
  { label: 'Pelvis', regions: ['Pelvis'] },
  { label: 'Lower limb', regions: ['Lower limb'] },
  { label: 'Foot', regions: ['Foot'] },
]

export function regionMastery(stats: Record<string, BoneStat>) {
  const names = byName(stats)
  return MASTERY_REGIONS.map((r) => {
    const bones = BONES.filter((b) => r.regions.includes(b.region))
    const mastered = bones.filter((b) => isMastered(names.get(nameKey(b))!)).length
    const seen = bones.filter((b) => names.get(nameKey(b))!.seen > 0).length
    return { label: r.label, total: bones.length, mastered, seen }
  })
}

/** Accuracy for one bone's name (both sides pooled). */
export function boneAccuracy(stats: Record<string, BoneStat>, b: Bone) {
  const n = byName(stats).get(nameKey(b))!
  return { seen: n.seen, correct: n.correct, mastered: isMastered(n) }
}

const dayMs = 86400000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Study streak in days. The current streak still counts if today has no study yet but yesterday had. */
export function streak(days: string[], today: string): { current: number; longest: number } {
  const set = new Set(days)
  const t = Date.parse(`${today}T00:00:00Z`)
  let start = set.has(today) ? t : t - dayMs
  let current = 0
  while (set.has(iso(start))) {
    current++
    start -= dayMs
  }
  let longest = 0
  for (const d of set) {
    if (set.has(iso(Date.parse(`${d}T00:00:00Z`) - dayMs))) continue // not the first day of a run
    let n = 0
    let x = Date.parse(`${d}T00:00:00Z`)
    while (set.has(iso(x))) {
      n++
      x += dayMs
    }
    longest = Math.max(longest, n)
  }
  return { current, longest }
}

/** Heat-map weeks ending with the week of `today` (Monday first): weeks × 7 cells of { date, count } (null = future). */
export function heatmap(daily: Record<string, number>, today: string, weeks: number) {
  const t = Date.parse(`${today}T00:00:00Z`)
  const dow = (new Date(t).getUTCDay() + 6) % 7 // Monday = 0
  const start = t - (dow + (weeks - 1) * 7) * dayMs
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const time = start + (w * 7 + d) * dayMs
      const date = iso(time)
      return time > t ? null : { date, count: daily[date] ?? 0 }
    }),
  )
}

/** 0–4 intensity for a day's count. */
export const level = (count: number) => (count === 0 ? 0 : count < 10 ? 1 : count < 25 ? 2 : count < 50 ? 3 : 4)
