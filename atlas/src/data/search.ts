import type { Bone } from './types'

/** Lower-case, strip accents and punctuation, collapse spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent transpositions). */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

/** Typos allowed for a word of this length. */
const tolerance = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : 3)

const SIDE_WORDS: Record<string, Bone['side']> = { left: 'left', l: 'left', lt: 'left', right: 'right', r: 'right', rt: 'right' }
const STOP = new Set(['of', 'the', 'bone', 'os'])

interface Entry {
  bone: Bone
  phrases: string[][] // each searchable phrase as words
}

export interface SearchHit {
  bone: Bone
  score: number // lower is better
}

/**
 * Typo-tolerant bone search. Matches each query word against the words of the bone's name,
 * Latin name and accepted spellings (prefix match for the word being typed). "left"/"right"
 * filter by side.
 */
export function createSearch(bones: Bone[]) {
  const entries: Entry[] = bones.map((bone) => ({
    bone,
    phrases: [bone.name, bone.latin, ...bone.acceptedSpellings].map((p) => normalize(p).split(' ').filter((w) => w && !STOP.has(w))),
  }))

  function wordCost(q: string, words: string[], isLast: boolean): number {
    let best = Infinity
    for (const w of words) {
      if (w === q) return 0
      if (isLast && q.length >= 2 && w.startsWith(q)) best = Math.min(best, 0.3)
      const tol = tolerance(Math.max(q.length, Math.min(w.length, q.length + 2)))
      const dist = editDistance(q, w, tol)
      if (dist <= tol) best = Math.min(best, dist)
      // Prefix with a typo while still typing: "scaph" ~ "scafoid"
      if (isLast && q.length >= 4 && w.length > q.length) {
        const pd = editDistance(q, w.slice(0, q.length), 1)
        if (pd <= 1) best = Math.min(best, 0.6 + pd)
      }
    }
    return best
  }

  return function search(query: string, limit = 8): SearchHit[] {
    const words = normalize(query).split(' ').filter(Boolean)
    let side: Bone['side'] | null = null
    const terms: string[] = []
    for (const w of words) {
      if (SIDE_WORDS[w] && words.length > 1) side = SIDE_WORDS[w]
      else if (!STOP.has(w)) terms.push(w)
    }
    if (!terms.length) return []
    const hits: SearchHit[] = []
    for (const e of entries) {
      if (side && e.bone.side !== side) continue
      let best = Infinity
      for (const phrase of e.phrases) {
        let total = 0
        for (let i = 0; i < terms.length && total < Infinity; i++) total += wordCost(terms[i], phrase, i === terms.length - 1)
        // Prefer phrases with no unmatched extra words (e.g. "rib" → ribs before "rib cage").
        if (total < Infinity) best = Math.min(best, total + (phrase.length - terms.length) * 0.05)
      }
      if (best < Infinity) hits.push({ bone: e.bone, score: best })
    }
    hits.sort(
      (a, b) =>
        a.score - b.score ||
        // Same bone name: left before right, so a pair stays together.
        a.bone.name.localeCompare(b.bone.name) ||
        a.bone.side.localeCompare(b.bone.side),
    )
    return hits.slice(0, limit)
  }
}
