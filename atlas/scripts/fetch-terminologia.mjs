// Downloads the Terminologia Anatomica term list (TA98 and TA2 codes, with English and Latin names) from Wikidata,
// which publishes it under CC0, into data/sources/terminologia.json. Run rarely; scripts/build-dictionary.mjs reads
// the saved copy, so building the dictionary needs no network.
//
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-terminologia.mjs
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const QUERY = `SELECT ?item ?ta ?ta2 ?en ?la WHERE {
  { ?item wdt:P1323 ?ta } UNION { ?item wdt:P7173 ?ta2 }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?la FILTER(LANG(?la) = "la") }
}`
// The query service sometimes times out part-way through and appends an error to the JSON: try again.
let rows
for (let attempt = 1; !rows; attempt++) {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'AtlasDictionaryBuilder/1.0' },
  })
  try {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    rows = JSON.parse(await res.text()).results.bindings
  } catch (e) {
    if (attempt >= 5) throw new Error(`Wikidata: ${e.message}`)
    console.log(`attempt ${attempt} failed (${e.message.slice(0, 60)}); retrying`)
    await new Promise((r) => setTimeout(r, 20000 * attempt))
  }
}
const byItem = new Map()
for (const r of rows) {
  const id = r.item.value.split('/').pop()
  const e = byItem.get(id) ?? { wikidata: id, ta98: [], ta2: [], en: '', la: '' }
  if (r.ta && !e.ta98.includes(r.ta.value)) e.ta98.push(r.ta.value)
  if (r.ta2 && !e.ta2.includes(r.ta2.value)) e.ta2.push(r.ta2.value)
  if (r.en) e.en = r.en.value
  if (r.la) e.la = r.la.value
  byItem.set(id, e)
}
const terms = [...byItem.values()].filter((e) => e.en || e.la).sort((a, b) => (a.ta98[0] ?? a.ta2[0] ?? '').localeCompare(b.ta98[0] ?? b.ta2[0] ?? '') || a.wikidata.localeCompare(b.wikidata))
writeFileSync(
  join(import.meta.dirname, '..', 'data', 'sources', 'terminologia.json'),
  JSON.stringify({ source: 'Wikidata (CC0): items with a TA98 (P1323) or TA2 (P7173) identifier, English and Latin labels', fetched: new Date().toISOString().slice(0, 10), count: terms.length, terms }, null, 0) + '\n',
)
console.log(`${terms.length} terms`)
