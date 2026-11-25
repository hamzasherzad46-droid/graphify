// The authoritative sources a word is approved against (data/sources/), in order: Terminologia Anatomica, the
// OpenStax A&P 2e glossary, MeSH, the NHS A–Z. Words are compared in British spelling: a source word in American
// spelling ("hematoma") approves only its British form ("haematoma"), never itself.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toBritish } from './british.mjs'

const DIR = join(import.meta.dirname, '..', '..', 'data', 'sources')
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'))
const words = (s) => (s.match(/\p{L}+(?:['’]\p{L}+)*/gu) ?? []).map((w) => w.replace(/['’]s$/, '').toLowerCase()).filter((w) => w.length > 1)

/** A source's words, each in its British form. */
const british = (list) => {
  const out = new Set()
  for (const w of list) out.add((toBritish(w) ?? w).toLowerCase())
  return out
}

let SOURCES = null
/** Built on first use (after the caller has set the speller's known words). */
function sources() {
  if (SOURCES) return SOURCES
  const ta = read('terminologia.json').terms
  SOURCES = [
    ['Terminologia Anatomica', british(ta.flatMap((t) => [...words(t.en), ...words(t.la)]))],
    ['OpenStax A&P 2e glossary', british(read('openstax-glossary.json').terms.flatMap(words))],
    ['MeSH (NLM)', british(read('mesh.json').words)],
    ['NHS A–Z', british(read('nhs.json').terms.flatMap(words))],
  ]
  return SOURCES
}

/** The first source that has this word (lower case, British spelling), or null. */
export function sourceOf(word) {
  const w = word.toLowerCase()
  for (const [name, set] of sources()) if (set.has(w)) return name
  return null
}

export const sourceNames = () => sources().map(([n]) => n)

const SUFFIXES = ['ising', 'ised', 'ises', 'ise', 'ation', 'ations', 'ally', 'ly', 'ing', 'ed', 'es', 's', 'er', 'ers', 'ive', 'ity', 'al', 'ic', 'ment', 'ness']
const ENDINGS = ['', 'e', 'ion', 'ation', 'isation', 'y', 'al', 'ic', 'ous', 'ia']
const PREFIXES = ['re', 'un', 'non', 'over', 'post', 'pre', 'sub', 'super', 'hyper', 'hypo', 'inter', 'intra', 'multi', 'poly', 'tri', 'bi', 'uni', 'dis', 'mid', 'neuro', 'cardio', 'photo', 'mechano', 'veno', 'vaso', 'sympatho', 'skeleto', 'dorso', 'medio', 'supero', 'antero', 'postero', 'micro', 'out', 'counter', 'sensori', 'angio']

/**
 * A word formed regularly from a source word: a suffix changed ("hyperpolarising" from "hyperpolarisation",
 * "resorbed" from "resorption") or a standard prefix added ("reoxygenation", "midsagittal"). Returns
 * "<source word> (<source>)", or null. Stems shorter than five letters are not used.
 */
export function derivedFrom(word) {
  const w = word.toLowerCase()
  const stems = new Set([w])
  for (const s of SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 5) stems.add(w.slice(0, -s.length))
  for (const stem of [...stems])
    for (const e of ENDINGS) {
      const c = stem + e
      if (c !== w && c.length >= 5 && sourceOf(c)) return `${c} (${sourceOf(c)})`
    }
  for (const p of PREFIXES)
    if (w.startsWith(p) && w.length - p.length >= 5) {
      const rest = w.slice(p.length).replace(/^-/, '')
      if (sourceOf(rest)) return `${p}- + ${rest} (${sourceOf(rest)})`
      const d = derivedFrom(rest)
      if (d) return `${p}- + ${d}`
    }
  return null
}
