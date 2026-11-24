// One spelling standard for imported text (OpenStax, Gray's): British spelling, modern letters (æ → ae), and one
// form per word (data/dictionary.json "forms": "antero-posterior" → "anteroposterior"). Used by both importers, which
// list it among the changes they made.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { britishText, setKeep, setKnownWords } from './british.mjs'

const dict = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'dictionary.json'), 'utf8'))
setKnownWords([...dict.terminologia.words, ...Object.keys(dict.approved), ...Object.keys(dict.proposed)])
setKeep(Object.keys(dict.keep ?? {}))
const FORMS = Object.entries(dict.forms ?? {}).map(([from, to]) => [new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), from, to])

const matchCase = (src, out) => (src[0] === src[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out)

export const stats = { british: new Map(), forms: new Map(), corrections: new Map(), ligatures: 0 }
const count = (map, k) => map.set(k, (map.get(k) ?? 0) + 1)

const CORRECTIONS = Object.fromEntries(
  Object.entries(dict.corrections ?? {}).map(([source, list]) => [source, Object.entries(list).map(([from, to]) => [new RegExp(`(?<![\\p{L}])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'gu'), from, to])]),
)

/** A string in the Atlas standard; `source` ('openstax' | 'grays') selects that book's corrections. */
export function normalise(text, source) {
  let t = text.replace(/[æÆœŒ]/g, (c) => (stats.ligatures++, { æ: 'ae', Æ: 'Ae', œ: 'oe', Œ: 'Oe' })[c])
  for (const [re, from, to] of CORRECTIONS[source] ?? [])
    t = t.replace(re, () => {
      count(stats.corrections, `${from} → ${to}`)
      return to
    })
  for (const [re, from, to] of FORMS)
    t = t.replace(re, (m) => {
      count(stats.forms, `${from} → ${to}`)
      return matchCase(m, to)
    })
  const b = britishText(t)
  for (const [from, to] of b.changes) count(stats.british, `${from.toLowerCase()} → ${to.toLowerCase()}`)
  return b.text
}

/** Keys whose values are identifiers or links, never text. */
const SKIP = new Set(['id', 'k', 'bone', 'src', 'to', 'module', 'uuid', 'url', 'commit', 'license', 'href', 'slug'])

/** Normalise every text value in a JSON-like structure (returns a new one). */
export function normaliseDeep(value, source, key = '') {
  if (typeof value === 'string') return SKIP.has(key) ? value : normalise(value, source)
  if (Array.isArray(value)) return value.map((v) => normaliseDeep(v, source, key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SKIP.has(k) ? v : normaliseDeep(v, source, k)]))
  return value
}

export const summary = () =>
  [`British spelling: ${[...stats.british.values()].reduce((a, b) => a + b, 0)} words`, `one form per word: ${[...stats.forms.values()].reduce((a, b) => a + b, 0)}`, `corrections: ${[...stats.corrections.values()].reduce((a, b) => a + b, 0)} of ${stats.corrections.size}`, `ligatures: ${stats.ligatures}`].join('; ')
