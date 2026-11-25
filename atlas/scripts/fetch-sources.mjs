// Downloads the authoritative word sources the text check approves words against, into data/sources/:
//
//   openstax-glossary.json  every key term in OpenStax Anatomy and Physiology 2e (all chapters; the pinned CC BY 4.0
//                           release the textbook is imported from)
//   mesh.json               every word of every MeSH 2026 heading and entry term (U.S. National Library of
//                           Medicine; American spelling, so a word matches when it is a MeSH word or its British form)
//   nhs.json                the NHS website's A–Z of conditions and of medicines (Open Government Licence v3.0)
//
// Terminologia Anatomica is fetched separately (scripts/fetch-terminologia.mjs). Run rarely:
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-sources.mjs
import { DOMParser } from '@xmldom/xmldom'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
// The commit the textbook is imported from (scripts/import-openstax.mjs PIN).
const PIN = 'b0058a743bdd2cc08196abaaa7d5469970c0d80c'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'data', 'sources')
const CACHE = join(ROOT, '.cache', 'sources')
mkdirSync(CACHE, { recursive: true })
const today = new Date().toISOString().slice(0, 10)

async function get(url, { binary = false, cacheAs } = {}) {
  const file = cacheAs && join(CACHE, cacheAs)
  if (file && existsSync(file)) return binary ? readFileSync(file) : readFileSync(file, 'utf8')
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'AtlasDictionaryBuilder/1.0' } })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      if (file) writeFileSync(file, buf)
      return binary ? buf : buf.toString('utf8')
    }
    if (attempt >= 6 || ![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${res.status} ${url}`)
    await new Promise((r) => setTimeout(r, 5000 * 2 ** Math.min(attempt, 4)))
  }
}

const words = (s) => (s.match(/\p{L}+(?:['’]\p{L}+)*/gu) ?? []).map((w) => w.replace(/['’]s$/, '').toLowerCase()).filter((w) => w.length > 1)

// OpenStax: every module of the book, its <definition><term>s.
const RAW = `https://raw.githubusercontent.com/openstax/osbooks-anatomy-physiology/${PIN}`
const collection = await get(`${RAW}/collections/anatomy-and-physiology-2e.collection.xml`, { cacheAs: 'collection.xml' })
const modules = [...collection.matchAll(/document="(m\d+)"/g)].map((m) => m[1])
const glossary = new Set()
for (const m of modules) {
  const xml = await get(`${RAW}/modules/${m}/index.cnxml`, { cacheAs: `${m}.cnxml` })
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  for (const t of [...doc.getElementsByTagName('term')]) {
    const text = (t.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text) glossary.add(text)
  }
}
writeFileSync(join(OUT, 'openstax-glossary.json'), JSON.stringify({ source: `OpenStax Anatomy and Physiology 2e, key terms of all ${modules.length} modules, commit ${PIN} (CC BY 4.0)`, fetched: today, terms: [...glossary].sort() }) + '\n')

// MeSH: descriptor names and entry terms.
const meshRaw = await get('https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2026.gz', { binary: true, cacheAs: 'desc2026.gz' })
// The server marks the file gzip-encoded, so fetch may already have decompressed it.
const mesh = (meshRaw[0] === 0x1f && meshRaw[1] === 0x8b ? gunzipSync(meshRaw) : meshRaw).toString('utf8')
const meshWords = new Set()
for (const m of mesh.matchAll(/<String>([^<]+)<\/String>/g)) for (const w of words(m[1])) meshWords.add(w)
writeFileSync(join(OUT, 'mesh.json'), JSON.stringify({ source: 'MeSH 2026 descriptors (headings and entry terms), courtesy of the U.S. National Library of Medicine', fetched: today, words: [...meshWords].sort() }) + '\n')

// NHS: the A–Z lists of conditions and medicines.
const nhs = new Set()
for (const p of ['conditions', 'medicines']) {
  const html = await get(`https://www.nhs.uk/${p}/`, { cacheAs: `nhs-${p}.html` })
  for (const m of html.matchAll(new RegExp(`<a[^>]+href="(?:https://www\\.nhs\\.uk)?/${p}/[^"]+"[^>]*>([\\s\\S]*?)</a>`, 'g'))) {
    const t = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, '’').trim()
    if (t && t.length < 120) nhs.add(t)
  }
}
writeFileSync(join(OUT, 'nhs.json'), JSON.stringify({ source: 'NHS website A–Z of conditions and of medicines (www.nhs.uk), Open Government Licence v3.0', fetched: today, terms: [...nhs].sort() }) + '\n')

console.log(`OpenStax glossary: ${glossary.size} terms (${modules.length} modules); MeSH: ${meshWords.size} words; NHS: ${nhs.size} names`)
