// Builds data/glossary.json: every key term OpenStax A&P 2e defines (all chapters), with its definition, in Atlas's
// spelling standard. Lessons show these when a technical term is tapped. Reads the book from .cache/sources
// (scripts/fetch-sources.mjs).
//   node scripts/build-glossary.mjs
import { DOMParser } from '@xmldom/xmldom'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalise } from './lib/textnorm.mjs'

const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, '.cache', 'sources')
const collection = readFileSync(join(CACHE, 'collection.xml'), 'utf8')
// Chapter and section numbers, as in the book: a chapter is a subcollection that holds modules (units hold chapters);
// the first module of a chapter is its introduction.
const number = new Map()
let ch = 0
const walk = (node) => {
  for (const c of [...(node.childNodes ?? [])].filter((x) => x.nodeType === 1)) {
    if (c.localName !== 'subcollection') {
      walk(c)
      continue
    }
    const content = [...c.childNodes].find((x) => x.localName === 'content')
    const mods = [...(content?.childNodes ?? [])].filter((x) => x.localName === 'module').map((x) => x.getAttribute('document'))
    if (mods.length) {
      ch++
      mods.forEach((m, k) => number.set(m, k === 0 ? `${ch}` : `${ch}.${k}`))
    } else walk(c)
  }
}
walk(new DOMParser().parseFromString(collection, 'text/xml'))
const text = (n) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim()
const terms = {}
for (const f of readdirSync(CACHE).filter((f) => /^m\d+\.cnxml$/.test(f))) {
  const m = f.replace('.cnxml', '')
  const doc = new DOMParser().parseFromString(readFileSync(join(CACHE, f), 'utf8'), 'text/xml')
  for (const d of [...doc.getElementsByTagName('definition')]) {
    const term = normalise(text(d.getElementsByTagName('term')[0]), 'openstax')
    const meaning = normalise(text(d.getElementsByTagName('meaning')[0]), 'openstax')
    if (!term || !meaning) continue
    // Looked up without a trailing abbreviation: "temporomandibular joint (TMJ)".
    const key = term.replace(/\s*\([A-Za-z]+\)$/, '').toLowerCase()
    if (!terms[key]) terms[key] = { term, meaning, section: number.get(m) ?? '' }
  }
}
const sorted = Object.fromEntries(Object.entries(terms).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(ROOT, 'data', 'glossary.json'), JSON.stringify({ source: 'OpenStax Anatomy and Physiology 2e, key terms and their definitions (CC BY 4.0), in Atlas’s spelling standard', terms: sorted }, null, 1) + '\n')
console.log(`${Object.keys(sorted).length} terms`)
