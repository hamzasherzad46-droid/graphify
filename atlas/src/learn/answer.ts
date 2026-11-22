import type { Bone } from '../data/types'
import { editDistance, normalize } from '../data/search'

const ORDINALS: Record<string, string> = {
  '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth',
  '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth', '11th': 'eleventh', '12th': 'twelfth',
}

/**
 * Canonical form for comparing typed answers: lower case, no accents or punctuation, ordinals spelled out,
 * British and American spellings folded together (ae/oe → e, -our → -or, -re → -er, -ise → -ize), no spaces.
 * Both the answer and every accepted spelling go through it, so it only ever merges spelling variants.
 */
export function canon(s: string): string {
  return normalize(s)
    .split(' ')
    .map((w) => ORDINALS[w] ?? w)
    .map((w) =>
      w
        .replace(/ae/g, 'e')
        .replace(/oe/g, 'e')
        .replace(/our$/, 'or')
        .replace(/([^aeiou])re$/, '$1er')
        .replace(/is(e|ed|es|ing|ation)$/, 'iz$1')
        .replace(/ys(e|ed|es|ing)$/, 'yz$1'),
    )
    .join('')
}

/** Every answer accepted for a bone: its English name and the accepted spellings in its content file. */
export function acceptedAnswers(b: Bone): string[] {
  return [...new Set([b.name, ...b.acceptedSpellings].map(canon))]
}

export type Verdict = 'correct' | 'close' | 'wrong'

/** 'close' = a small slip (still marked wrong, but the feedback says so). */
export function checkAnswer(b: Bone, typed: string): Verdict {
  const t = canon(typed)
  if (!t) return 'wrong'
  const accepted = acceptedAnswers(b)
  if (accepted.includes(t)) return 'correct'
  const best = Math.min(...accepted.map((a) => editDistance(t, a, 3)))
  return best <= (t.length >= 6 ? 2 : 1) ? 'close' : 'wrong'
}
