// Writes docs/review-pack.md: everything awaiting the reviewer, in one file.
//   1. The structure lessons in full, every † statement highlighted with its source (or "no source found").
//   2. The layered flashcards in full, all layers.
//   3. The words that match no source, by type, with where they appear and a suggested correction.
// Needs .cache/textcheck.json (node scripts/textcheck.mjs --json). Run: npm run review:pack
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'))
const bones = new Map(readdirSync(join(ROOT, 'content', 'bones')).map((f) => json('content', 'bones', f)).map((b) => [b.id, b.name]))
const sections = new Map(json('content', 'textbook', 'index.json').sections.map((s) => [s.id, s]))
const dict = json('data', 'dictionary.json')
const check = json('.cache', 'textcheck.json')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ── Sources ─────────────────────────────────────────────────────────────────────────────────────────────── */

const sectionName = (id) => {
  const s = sections.get(id)
  return s ? (s.num.includes('.') ? `${s.num} ${s.title}` : `chapter ${s.num} introduction`) : id
}
/** "s8-2#fs-id2110691" → "OpenStax 8.2 Bones of the Upper Limb, ¶fs-id2110691". */
const ref = (src) => (src.startsWith('reviewer:') ? `Atlas academic reviewer, ${new Date(src.slice(9)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : src.startsWith('glossary:') ? `OpenStax glossary: “${src.slice(9)}”` : `OpenStax ${sectionName(src.split('#')[0])}, ¶${src.split('#')[1]}`)

let daggers = 0
/** A statement: plain with its sources, or (when it awaits a source check) highlighted, with what was and was not found. */
function said(f, text = f.t) {
  if (!f.check) return `${esc(text)} <small>[${f.src.map(ref).join('; ')}]</small>`
  daggers++
  const found = f.src.length ? `**Partly sourced:** ${f.src.map(ref).join('; ')}. **Not found:** ${esc(f.check)}` : `**No source found.** ${esc(f.check)}`
  return `<mark>† ${esc(text)}</mark><br><small>${found}</small>`
}

/* ── 1. Structure lessons ────────────────────────────────────────────────────────────────────────────────── */

const ORDER = ['humerus', 'scapula', 'scaphoid', 'sphenoid', 'mandible']
const lessons = readdirSync(join(ROOT, 'content', 'structures'))
  .map((f) => json('content', 'structures', f))
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))

const out = []
const lessonOut = []
lessons.forEach((s, k) => {
  const L = lessonOut
  L.push(`### 1.${k + 1} ${bones.get(s.bone)}`, '', `*${s.source}. Status: ${s.reviewStatus}.*`, '')
  L.push('**1. In one line**', '', `- ${said(s.oneLine.main)}`, `- *Explain simpler:* ${said(s.oneLine.simpler)}`, `- *Explain deeper:* ${said(s.oneLine.deeper)}`, '')
  L.push('**2. Where it is**', '', ...s.where.facts.map((f) => `- ${said(f)}`), `- *Explain simpler:* ${said(s.where.simpler)}`, `- *Explain deeper:* ${said(s.where.deeper)}`, '')
  L.push('**3. Key features**', '', ...s.features.items.map((f) => `- **${esc(f.name)}.** ${said(f)}`), `- *Explain simpler:* ${said(s.features.simpler)}`, `- *Explain deeper:* ${said(s.features.deeper)}`, '')
  L.push('*Go deeper:*', '')
  L.push('**4. Form → function**', '', ...s.formFunction.facts.map((f) => `- ${said(f)}`), `- *Explain simpler:* ${said(s.formFunction.simpler)}`, '')
  L.push('**5. Relations**', '', ...s.relations.items.map((f) => `- *${f.kind}*, **${esc(f.name)}.** ${said(f)}`), `- *Explain simpler:* ${said(s.relations.simpler)}`, '')
  L.push('**6. Development**', '', ...s.development.facts.map((f) => `- ${said(f)}`), '')
  L.push('**7. Variations**', '', ...(s.variations.facts.length ? s.variations.facts.map((f) => `- ${said(f)}`) : ['- *None from an approved source yet. The app says so.*']), '')
  L.push('**8. Clinical reasoning**', '')
  s.clinical.items.forEach((c, j) => {
    const body = `**Injury:** ${esc(c.injury)} **Damaged:** ${esc(c.damaged)} **Patient can’t:** ${esc(c.cannotDo)} **Why:** ${esc(c.why)}`
    L.push(`${j + 1}. ${c.check ? said(c, `Injury: ${c.injury} Damaged: ${c.damaged} Patient can’t: ${c.cannotDo} Why: ${c.why}`) : `${body} <small>[${c.src.map(ref).join('; ')}]</small>`}`)
  })
  L.push('', '**9. Tutorial questions**', '')
  s.tutorial.items.forEach((t, j) => {
    L.push(`${j + 1}. *${t.kind[0].toUpperCase()}${t.kind.slice(1)}.* ${said(t, t.q)}`, '', '   Model answer:', '', ...t.model.map((m) => `   - ${esc(m)}`), '')
  })
  L.push('**Check yourself** (answers in bold)', '')
  s.check.forEach((q, j) => {
    L.push(`${j + 1}. ${esc(q.stem)} ${q.options.map((o, i) => (i === q.answer ? `**${'ABCD'[i]}. ${esc(o)}**` : `${'ABCD'[i]}. ${esc(o)}`)).join(' · ')}<br>*${esc(q.why)}* <small>[${q.src.map(ref).join('; ')}]</small>`)
  })
  L.push('')
})
const lessonDaggers = daggers

/* ── 2. Flashcards ───────────────────────────────────────────────────────────────────────────────────────── */

daggers = 0
const LEVEL = { core: 'Core', higher: 'Higher', distinction: 'Distinction' }
const cards = ['skull', 'upper-limb'].flatMap((t) => json('content', 'cards', `${t}.json`).cards)
const cardOut = []
cards.forEach((c, k) => {
  const C = cardOut
  C.push(`### 2.${k + 1} ${esc(c.front)}`, '', `*${LEVEL[c.level]} · ${c.type} · ${c.topic === 'skull' ? 'Skull' : 'Upper limb'} · bone: ${bones.get(c.bone)} · 3D view on the front: ${c.frontView ? 'yes' : 'no'} · ${c.reviewStatus}*`, '')
  C.push(`- **Objective:** ${esc(c.objective)}`, `- **Front:** ${esc(c.front)}`, `- **Answer:** **${esc(c.answer)}**`, `- **Why:** ${said(c.why)}`)
  if (c.simpler) C.push(`- **Explain simpler:** ${said(c.simpler)}`)
  C.push('- **Go deeper:**', ...c.depth.map((d) => `    - ${said(d)}`))
  C.push(`- **Clinical:** ${said(c.clinical)}`)
  if (c.hook) C.push(`- **Memory hook:** ${said(c.hook)}`)
  C.push(`- **Exam trap:** ${said(c.trap)}`, `- **Source line:** ${esc(c.source)}`, '')
})
const cardDaggers = daggers

/* ── 3. Words ────────────────────────────────────────────────────────────────────────────────────────────── */

const TYPO = {
  engrained: '“ingrained” (the usual British form)',
  reoccurrence: '“recurrence”',
  neuroaxis: '“neuraxis” (the usual spelling)',
  braincase: '“brain case”, the form used 31 times elsewhere',
  epiphysical: '“epiphysial” (Gray’s usual form): probably a transcription error; check the 1918 scan',
  chemoprosope: '“chamaeprosope” (Gray’s “chamæprosope”, short-faced): probably a transcription error',
}
const OTHER = {
  absorber: 'General word.', backflow: 'General word.', blocky: 'General word, in a figure description.', bottommost: 'General word.', centremost: 'General word.',
  comparator: 'General word (control systems).', equilibrate: 'General word.', greyscale: 'General word.', millivolts: 'Unit.', regionalisation: 'General word.',
  resistive: 'General word.', subtest: 'General word.', sucralose: 'Sweetener (chemical name).', frictionless: 'General word.', flexuous: 'General word (winding).',
  callout: 'Figure label; suggest “label”.', callouts: 'As callout: “labels”.', foosball: 'American; British: “table football”.',
  pinky: 'Informal (American). Kept only as a Spelling Quiz alternative and in OpenStax’s mnemonic; Atlas text says “little finger”.',
  kah: 'Syllable in a pronunciation test (“lah-kah-pah”).', lah: 'As kah.', yan: 'Syllable in a pronunciation guide.',
  notesquote: 'Field name in the AI prompt (never shown to students).', whynot: 'Field name in the AI prompt (never shown to students).',
  distractors: 'Question-writing term (the wrong options), in the AI prompt only.', oe: 'Letter pair, in the note on Gray’s spelling (œ written oe).',
}
const ABBR_EXTRA = { sba: 'Single best answer: question type name, in the AI prompt only.', oss: '“oss.” = ossis (Latin, “of the bone”), Gray’s abbreviation.' }
const FRAGMENT = new Set(['antero', 'infero', 'medio', 'naso', 'masto', 'concavo', 'basi'])
/** Modern (Terminologia Anatomica) names for Gray’s historical terms. Gray’s text itself is left as published. */
const MODERN = {
  anconaeus: 'anconeus', caninus: 'levator anguli oris', peronaei: 'fibularis', peronaeus: 'fibularis', sternothyroideus: 'sternothyroid', musculospiral: 'radial (groove, nerve)',
  ensiform: 'xiphoid (process)', multangulum: 'trapezium / trapezoid', multangulars: 'trapezium and trapezoid', nasalia: 'nasal bones', metacarpalia: 'metacarpals', metatarsalia: 'metatarsals',
  sublimis: 'superficialis (flexor digitorum superficialis)', volaris: 'palmar', torcular: 'confluence of the sinuses', cancellated: 'spongy (cancellous)', cancelli: 'trabeculae of spongy bone',
  trichterbrust: 'pectus excavatum (funnel chest)', papyracea: 'orbital plate of the ethmoid', tectoria: 'tectorial (membrane)', calcaneum: 'calcaneus', calcis: 'calcaneus (os calcis)', unciform: 'hamate',
  multangular: 'trapezium / trapezoid', peroneus: 'fibularis (peroneus) longus', demifacet: 'costal facet (demifacet)', demifacets: 'costal facets (demifacets)', gonial: 'angle of the mandible (gonial angle)',
  midface: '“middle third of the face” where the reader may not know “midface”',
  fallopii: 'facial canal (canalis Fallopii)', vesalii: 'sphenoidal emissary foramen (foramen Vesalii)', glaserian: 'petrotympanic fissure (Glaserian fissure)', pacchionian: 'arachnoid granulations (Pacchionian bodies)',
  poupart: 'inguinal ligament (Poupart’s ligament)', gimbernat: 'lacunar ligament (Gimbernat’s ligament)', stenson: 'parotid duct (Stenson’s duct)', ludovici: 'sternal angle (angulus Ludovici)',
  macewen: 'suprameatal triangle (Macewen’s triangle)', whitnall: 'lateral orbital tubercle (Whitnall’s tubercle)', chassaignac: 'carotid tubercle (Chassaignac’s tubercle)',
}

/** Where a word is, in words. */
function where(path) {
  let m
  if ((m = /^content\/textbook\/(s\d+-\d+|ch\d+)\.json(.*)$/.exec(path))) return `OpenStax ${sectionName(m[1])}${/\.alt\b/.test(m[2]) ? ' (figure description)' : /keyPoints/.test(m[2]) ? ' (key points)' : ''}`
  if ((m = /^content\/classic\/(s\d+-\d+)\.json(.*)$/.exec(path))) return `Gray’s 1918, with ${sectionName(m[1])}${/source\.changes/.test(m[2]) ? ' (Atlas note on changes)' : ''}`
  if ((m = /^content\/bones\/(.+?)\.json\.?(.*)$/.exec(path))) return `Bone information: ${bones.get(m[1]) ?? m[1]}${m[2] ? ` (${m[2].replace(/\[\d+\]/g, '')})` : ''}`
  if ((m = /^content\/cards\/(.+?)\.json\.cards\[(\d+)\]\.?(.*)$/.exec(path))) {
    const n = cards.findIndex((c) => c.id === json('content', 'cards', `${m[1]}.json`).cards[Number(m[2])].id) + 1
    return `Flashcard 2.${n} (${m[3].replace(/\.check$/, ', source note').replace(/\.t$/, '').replace(/\[(\d+)\]/, (_, d) => ` ${Number(d) + 1}`)})`
  }
  if ((m = /^content\/questions\/(.+?)\.json/.exec(path))) return `Exam question, ${m[1]}`
  if ((m = /^content\/structures\/(.+?)\.json/.exec(path))) return `Structure lesson: ${m[1]}`
  if (path.startsWith('server/')) return `Question service (AI prompt): ${path}`
  if (path.startsWith('src/')) return `App screen: ${path}`
  return path
}

const used = new Map(check.proposedUsed.map((x) => [x[0], { count: x[1], ctx: x[4] ?? [] }]))
const all = [...Object.entries(dict.proposed), ...Object.entries(dict.historical ?? {}).filter(([, e]) => !e.reviewed)]
const TYPES = ['Medical term', 'Name', 'Abbreviation', 'Possible typo', 'Other (not a medical term: general words, syllables, internal labels)']
const groups = new Map(TYPES.map((t) => [t, []]))
for (const [word, info] of all) {
  const lw = word.toLowerCase()
  const g = info.group
  let type = 'Medical term'
  let note = info.suggestion ?? ''
  if (TYPO[lw]) ((type = 'Possible typo'), (note = `Suggest ${TYPO[lw]}.`))
  else if (OTHER[lw]) ((type = TYPES[4]), (note = OTHER[lw]))
  else if (ABBR_EXTRA[lw]) ((type = 'Abbreviation'), (note = ABBR_EXTRA[lw]))
  else if (/^Abbreviation/.test(g)) ((type = 'Abbreviation'), (note = info.suggestion ?? ''))
  else if (/name/i.test(g)) type = 'Name'
  if (FRAGMENT.has(lw)) note = 'First part of a hyphenated word (for example “antero-posteriorly”); correct as written.'
  else if (/etymology/.test(g)) note = 'Latin or Greek word part, in an OpenStax note on where a term comes from; correct as written.'
  if (MODERN[lw]) note = `${note ? `${note} ` : ''}Modern term: ${MODERN[lw]}.`
  if (/^Gray/.test(g) && type !== 'Possible typo') note = `${note ? `${note} ` : ''}Gray’s text is left as published.`
  const u = used.get(lw)
  groups.get(type).push({ word, count: u?.count ?? 0, ctx: u?.ctx ?? [], note, gray: /^Gray/.test(g) })
}

const wordOut = []
let total = 0
for (const [type, list] of groups) {
  if (!list.length) continue
  total += list.length
  list.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }))
  wordOut.push(`### ${type} (${list.length})`, '', '| Word | Uses | Where it appears | Suggestion or note |', '|---|---|---|---|')
  for (const w of list) {
    const ctx = w.ctx.map(([p, t]) => `${esc(where(p))}: “…${esc(t)}…”`).join('<br>')
    wordOut.push(`| **${esc(w.word)}** | ${w.count} | ${ctx || '—'} | ${esc(w.note) || 'Correct as written: approve, or tell me otherwise.'} |`)
  }
  wordOut.push('')
}

/* ── The file ────────────────────────────────────────────────────────────────────────────────────────────── */

const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
out.push(
  '# Atlas: everything awaiting your review',
  '',
  `${today}. One file: the ${lessons.length} sample structure lessons, the ${cards.length} sample flashcards and the ${total} words that match no source. No more Skull or Upper limb content will be written until this is reviewed.`,
  '',
  '**How sources are shown.** After each statement, in small type: the OpenStax A&P 2e section and paragraph it comes from, or the OpenStax glossary entry. A <mark>highlighted † statement</mark> is not confirmed by the imported OpenStax chapters (6–9, 12–16 and 20): beneath it is any part that is sourced, and what was not found. In the app these statements carry a † and the lesson or card stays a draft.',
  '',
  '## Contents',
  '',
  `1. Structure lessons (${lessons.length}), ${lessonDaggers} † statements`,
  `2. Layered flashcards (${cards.length}), ${cardDaggers} † statements`,
  `3. Words that match no source (${total}), by type`,
  '',
  `## 1. Structure lessons (${lessonDaggers} † statements)`,
  '',
  'Layers 1–3 are shown first; layers 4–9 open under “Go deeper”. Each lesson ends with three check questions.',
  '',
  ...lessonOut,
  `## 2. Layered flashcards (${cardDaggers} † statements)`,
  '',
  'Every layer of each card: the answer, then Why (with Explain simpler), Go deeper, Clinical, the memory hook where there is one, and the exam trap.',
  '',
  ...cardOut,
  `## 3. Words that match no source (${total})`,
  '',
  'Each word is in none of: the en-GB dictionary, Terminologia Anatomica, the OpenStax A&P 2e glossary, MeSH (British spelling), the NHS A–Z, or a regular form of a word in them. “Uses” counts every appearance; up to two are quoted. Words in Gray’s 1918 text are listed for information: that text stays as published, apart from clear transcription errors (marked “possible typo”).',
  '',
  'Already decided, so not listed: “examinable” (approved); “pptx”, “docx” and “PDFs” (internal use only; students see “PowerPoint”, “Word” and “PDF”, or “.pptx”/“.docx”); “acromiale” (only in the full term “os acromiale”; the text check flags it anywhere else).',
  '',
  ...wordOut,
)
writeFileSync(join(ROOT, 'docs', 'review-pack.md'), out.join('\n'))
console.log(`docs/review-pack.md: ${lessons.length} lessons (${lessonDaggers} †), ${cards.length} cards (${cardDaggers} †), ${total} words: ${[...groups].map(([t, l]) => `${t.split(' (')[0]} ${l.length}`).join(', ')}`)
