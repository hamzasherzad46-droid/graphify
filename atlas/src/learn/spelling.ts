import type { Bone } from '../data/types'
import { normalize } from '../data/search'
import setsJson from '../../content/sets.json'
import { BONE_BY_ID } from '../data/bones'

/**
 * Letter-by-letter spelling. The answers for a bone are its name and its accepted spellings (synonyms and
 * British/American forms from its content file), lower case with punctuation turned into spaces. A key is accepted
 * if what has been typed plus that key still starts at least one answer. Answers with digits ("c7") are left out:
 * the keyboard has letters only.
 */
export function answersFor(b: Bone): string[] {
  const out: string[] = []
  for (const a of [b.name, ...b.acceptedSpellings]) {
    const n = normalize(a)
    if (n && !/\d/.test(n) && !out.includes(n)) out.push(n)
  }
  return out
}

export type KeyResult =
  | { ok: true; typed: string; done: boolean; target: string }
  | { ok: false; typed: string; target: string }

/** The answer being spelled: the first that starts with what has been typed (the bone's name, if it still fits). */
export function targetFor(answers: string[], typed: string): string {
  return answers.find((a) => a.startsWith(typed)) ?? answers[0]
}

/**
 * One key press: a letter or ' '. A letter typed where a space is expected is accepted with the space added for
 * you. `done` as soon as the typed text is a whole accepted answer ("innominate" finishes, even though
 * "innominate bone" is also accepted).
 */
export function press(answers: string[], typed: string, key: string): KeyResult {
  const k = key.toLowerCase()
  const tries = k === ' ' ? [typed + ' '] : [typed + k, typed + ' ' + k]
  for (const t of tries) {
    if (answers.some((a) => a.startsWith(t))) {
      const done = answers.includes(t)
      return { ok: true, typed: t, done, target: done ? t : targetFor(answers, t) }
    }
  }
  return { ok: false, typed, target: targetFor(answers, typed) }
}

/** The next letter of the answer being spelled (Hint), with any space before it. */
export function hint(answers: string[], typed: string): KeyResult {
  const target = targetFor(answers, typed)
  if (!target.startsWith(typed) || typed.length >= target.length) return { ok: false, typed, target }
  let t = typed + target[typed.length]
  if (target[t.length - 1] === ' ' && t.length < target.length) t += target[t.length]
  return { ok: true, typed: t, done: t === target, target }
}

/** Known: finished with no hints and at most one wrong key. Anything else goes to Weak Bones. */
export const isKnown = (r: { done: boolean; skipped: boolean; hints: number; errors: number }) => r.done && !r.skipped && r.hints === 0 && r.errors <= 1

export interface SpellingSet {
  id: string
  region: string
  title: string
  statement: string
  bones: string[]
}
export const SETS: SpellingSet[] = setsJson.sets
export const setById = (id: string) => SETS.find((s) => s.id === id)
export const setBones = (s: SpellingSet) => s.bones.map((id) => BONE_BY_ID.get(id)!).filter(Boolean)

/** "in 3 days", "in 10 minutes", "tomorrow". */
export function friendlyIn(ms: number): string {
  const min = ms / 60000
  if (min < 1.5) return 'in a minute'
  if (min < 60) return `in ${Math.round(min)} minutes`
  const h = min / 60
  if (h < 20) return `in ${Math.round(h)} ${Math.round(h) === 1 ? 'hour' : 'hours'}`
  const d = Math.round(h / 24)
  if (d <= 1) return 'tomorrow'
  if (d < 45) return `in ${d} days`
  const mo = Math.round(d / 30)
  return `in ${mo} ${mo === 1 ? 'month' : 'months'}`
}
