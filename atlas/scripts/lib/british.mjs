// British English spelling for Atlas: a speller (en-GB, "-ise" spelling, from dictionary-en-gb) and a converter from
// American spellings, used by the importers and the text check.
//
// The converter uses VarCon (Variant Conversion Info, from SCOWL by Kevin Atkinson, via the varcon package): every
// verified American form whose British form differs, except where the choice depends on the sense (meter/metre,
// program/programme, check/cheque), which VarCon marks and which are never converted automatically. Words VarCon does
// not list are converted by a few medical rules (hem- → haem-, -emia → -aemia, -ize → -ise …), but only when the
// British form is a known word; anything else is left for a person to decide.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import nspell from 'nspell'
import enGB from 'dictionary-en-gb'

const require = createRequire(import.meta.url)
export const speller = nspell(enGB)

/** Extra known words (anatomical terms, approved words) that make a converted form acceptable. */
let extra = new Set()
export const setKnownWords = (words) => (extra = new Set([...words].map((w) => w.toLowerCase())))
/** Words kept as they are, where British medical usage differs from general British spelling (specialty, sulfur). */
let keep = new Set()
export const setKeep = (words) => (keep = new Set([...words].map((w) => w.toLowerCase())))
export const known = (w) => speller.correct(w) || speller.correct(w.toLowerCase()) || extra.has(w.toLowerCase())

/** American → British, from VarCon (lower case). */
export const VARCON = (() => {
  const text = readFileSync(join(dirname(require.resolve('varcon/package.json')), 'varcon.txt'), 'utf8')
  const map = new Map()
  // Only entries VarCon marks <verified>: the others include rare and archaic British forms ("glutaeus", "raphae").
  let verified = false
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) verified = line.includes('<verified>')
    if (!line || line.startsWith('#') || line.includes('|') || !verified) continue // "|" marks a sense-dependent choice
    let us = null
    let gb = null
    for (const group of line.split(' / ')) {
      const m = group.match(/^([A-Za-z\s-]+):\s*(.+)$/)
      if (!m) continue
      const tags = m[1].trim().split(/\s+/)
      const word = m[2].trim()
      if (tags.includes('A') && !tags.includes('B')) us = word
      if (tags.includes('B')) gb = word
    }
    if (us && gb && us !== gb && !/\s/.test(us) && !/\s/.test(gb)) map.set(us.toLowerCase(), gb.toLowerCase())
  }
  return map
})()

/** Medical spelling rules for words VarCon does not list: [American pattern, British replacement]. */
const RULES = [
  [/^hem(?=[aoi])/, 'haem'],
  [/^(an|hyper|hypo|leuk|isch|septic|tox|ur|glyc|lip|bacter|vir|pyr)emi/, '$1aemi'],
  [/emia$/, 'aemia'],
  [/emic$/, 'aemic'],
  [/^esoph/, 'oesoph'],
  [/^gastroesoph/, 'gastro-oesoph'],
  [/^edem/, 'oedem'],
  [/^anesth/, 'anaesth'],
  [/^pediat/, 'paediat'],
  [/^orthoped/, 'orthopaed'],
  [/^ischem/, 'ischaem'],
  [/^estr(?=[aoi])/, 'oestr'],
  [/^gynec/, 'gynaec'],
  [/^cecum|^cec(?=al)/, 'caec'],
  [/^celiac/, 'coeliac'],
  [/^dyspne/, 'dyspnoe'],
  [/^apne/, 'apnoe'],
  [/^diarrhe/, 'diarrhoe'],
  [/^leuk(?=oc)/, 'leuc'],
  [/iz(e|ed|es|ing|ation|ations|er|ers)$/, 'is$1'],
  [/yz(e|ed|es|ing|er)$/, 'ys$1'],
  [/or$/, 'our'],
  [/ors$/, 'ours'],
  [/er$/, 're'],
  [/ers$/, 'res'],
  [/eling$/, 'elling'],
  [/eled$/, 'elled'],
  [/ense$/, 'ence'],
  [/og$/, 'ogue'],
  [/ogs$/, 'ogues'],
]

/** Words that look like American spellings but are not: Henry Gray (Gray's Anatomy), and "arbor" (arbor vitae, Latin). */
const PROTECTED = new Set(['Gray', 'GRAY', 'arbor', 'Arbor'])

/**
 * Rules that hold for every word: -ize/-yze → -ise/-yse (words of the "size" family are dictionary words and never get
 * here), -emia/-emic → -aemia/-aemic, hem(a/o)- → haem(a/o)- ("hemi-", half, is a different prefix and is kept), and -esthesia → -aesthesia.
 */
const SURE = [
  [/(?<=[a-z]{3})iz(e|ed|es|ing|ation|ations|er|ers|able)$/, 'is$1'],
  [/(?<=[a-z]{3})yz(e|ed|es|ing|er)$/, 'ys$1'],
  [/([^ae])emi(a|as|c)$/, '$1aemi$2'],
  [/^(hyper|hypo|an|poly|leuk)?hem(?=at|o|or|ang|ost|og)/, '$1haem'],
  [/([^a])esthe(sia|sias|tic|tics|tist|tists)$/, '$1aesthe$2'],
  [/rrhea$/, 'rrhoea'],
]

const matchCase = (src, out) => (src === src.toUpperCase() && src.length > 1 ? out.toUpperCase() : src[0] === src[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out)

/**
 * The British spelling of a single word, or null when it is already British, unknown, or the choice needs a person.
 */
export function toBritish(word) {
  if (PROTECTED.has(word)) return null
  const lower = word.toLowerCase()
  // Latin and other approved words stay as they are ("arbor vitae", "et"), as do the medical spellings kept on purpose.
  if (extra.has(lower) || keep.has(lower)) return null
  const v = VARCON.get(lower)
  if (v && !speller.correct(lower)) return matchCase(word, v)
  if (v && known(v) && lower.endsWith('ize')) return matchCase(word, v)
  if (known(lower)) return null
  // Rules safe for any word, so applied even where the British form is not yet in a dictionary ("hyperpolarisation").
  for (const [re, rep] of SURE) if (re.test(lower)) return matchCase(word, lower.replace(re, rep))
  for (const [re, rep] of RULES) {
    if (!re.test(lower)) continue
    const out = lower.replace(re, rep)
    if (out !== lower && known(out)) return matchCase(word, out)
  }
  return null
}

/** Convert every American spelling in a text; returns the new text and the changes made. */
export function britishText(text) {
  const changes = []
  const out = text.replace(/[A-Za-zÀ-ÿ]+(?:['’][A-Za-z]+)?/g, (w) => {
    const base = w.replace(/['’]s$/, '')
    const b = toBritish(base)
    if (!b) return w
    changes.push([base, b])
    return b + w.slice(base.length)
  })
  return { text: out, changes }
}
