// Builds data/abbreviations.json: the full form of every abbreviation, harvested from the definitions OpenStax A&P 2e
// itself gives ("the central nervous system (CNS)") across the whole book, where the initials match, plus the
// hand-kept `atlas` entries for abbreviations OpenStax does not define. Used to write each abbreviation out in full the
// first time it appears in a lesson. Reads the book from .cache/sources (scripts/fetch-sources.mjs).
//   node scripts/build-abbreviations.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { britishText, speller } from './lib/british.mjs'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'data', 'abbreviations.json')
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const CACHE = join(ROOT, '.cache', 'sources')
const text = readdirSync(CACHE)
  .filter((f) => f.endsWith('.cnxml'))
  .map((f) => readFileSync(join(CACHE, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
  .join('\n')

/** Does `phrase` (its last words) spell `abbr`'s capital letters as initials, or contain them in order? */
function fit(phrase, abbr) {
  const letters = abbr.replace(/s$/, '').replace(/[^A-Z]/g, '').toLowerCase()
  const words = phrase.split(/\s+/).filter(Boolean)
  // The shortest run of final words that fits: "cerebrospinal fluid", not "the CNS cerebrospinal fluid".
  for (let n = 1; n <= Math.min(words.length, letters.length + 2); n++) {
    const tail = words.slice(-n)
    if (!tail[0] || tail[0][0].toLowerCase() !== letters[0]) continue
    // Each letter starts a word, or appears in order inside one (e.g. "Acetylcholine" → ACh).
    let k = 0
    for (const w of tail) for (const ch of w.toLowerCase()) if (ch === letters[k]) k++
    // Each word of a hyphenated compound counts as a word ("blood–brain", "gamma-aminobutyric").
    if (k >= letters.length && tail.every((w) => /^[a-z]/i.test(w))) return tail.join(' ')
  }
  return null
}

const found = new Map()
for (const m of text.matchAll(/([A-Za-z][A-Za-z'’ /-]{2,80}?) \(((?:[A-Z]{2,}|[A-Z][a-z]?[A-Z][A-Za-z]*))\)/g)) {
  const full = fit(m[1].trim(), m[2])
  if (!full) continue
  // The first word in lower case when it is an ordinary word (it was capitalised only to start a sentence); names
  // keep their capital ("Duchenne", "New York").
  const first = full.split(' ')[0]
  const titled = full.split(' ').slice(1).some((w) => /^[A-Z][a-z]/.test(w)) // a name: "Food and Drug Administration"
  const lowered = !titled && /^[A-Z][a-z-]+$/.test(first) && speller.correct(first.toLowerCase()) ? first.toLowerCase() + full.slice(first.length) : full
  const f = britishText(lowered).text
  const e = found.get(m[2]) ?? new Map()
  e.set(f, (e.get(f) ?? 0) + 1)
  found.set(m[2], e)
}
const openstax = Object.fromEntries(
  [...found].sort().map(([a, e]) => [a, [...e].sort((x, y) => y[1] - x[1])[0][0]]),
)
const data = {
  about: 'Full forms of abbreviations, written out the first time an abbreviation appears in each lesson. `openstax`: harvested from the definitions in OpenStax A&P 2e (most frequent form, British spelling). `atlas`: kept by hand. `notAbbreviations`: capitals that are names, product names or mnemonics spelled out in place.',
  openstax,
  atlas: old.atlas ?? {},
  notAbbreviations: old.notAbbreviations ?? {},
}
writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n')
console.log(`${Object.keys(openstax).length} from OpenStax, ${Object.keys(data.atlas).length} Atlas`)
