// Writes docs/structures-review.md: every structure lesson (content/structures) in full, for review, with the source
// of each statement and a list of everything still awaiting a source check (†).
//   node scripts/structures-review.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'content', 'structures')
const bones = new Map()
for (const f of readdirSync(join(ROOT, 'content', 'bones'))) {
  const b = JSON.parse(readFileSync(join(ROOT, 'content', 'bones', f), 'utf8'))
  bones.set(b.id, b.name)
}
const ORDER = ['humerus', 'scapula', 'scaphoid', 'sphenoid', 'mandible']
const lessons = readdirSync(DIR)
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))
  .sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99))

/** "s8-2#fs-id2110691" → "8.2 ¶fs-id2110691"; "glossary:optic canal" → "glossary: optic canal". */
const ref = (s) => (s.startsWith('glossary:') ? `glossary: ${s.slice(9)}` : `${s.split('#')[0].slice(1).replace('-', '.')} ¶${s.split('#')[1]}`)
const srcOf = (f) => {
  const parts = f.src.map(ref)
  if (f.check) parts.push(`† ${f.check}`)
  return parts.length ? ` <sub>[${parts.join('; ')}]</sub>` : ''
}
const dag = (f) => (f.check ? ' †' : '')
const line = (f) => `${f.t}${dag(f)}${srcOf(f)}`

const out = []
const pending = []
out.push('# Structure lessons: 5 samples for review', '')
out.push(
  'Draft lessons in the nine-layer format, for review before the remaining Skull and Upper limb structures are written. All five are in the app: Home → Lessons → Textbook → Skull or Upper limb → *Structure by structure*.',
  '',
  '**Layers.** 1 In one line · 2 Where it is · 3 Key features (shown first) · then under *Go deeper*: 4 Form → function · 5 Relations · 6 Development · 7 Variations · 8 Clinical reasoning · 9 Tutorial questions · then a three-question check. Layers 1–3 have *Explain simpler* and *Explain deeper*; layers 4–5 have *Explain simpler*.',
  '',
  '**Sources.** Each statement shows its OpenStax A&P 2e paragraph (section ¶paragraph id) or glossary entry. A **†** marks a statement that the imported OpenStax chapters (6–9, 12–16 and 20) do not confirm: it is shown with a dagger in the app and listed at the end. Nothing is marked reviewed.',
  '',
  '**Writing checks (automatic).** At most 20 words a sentence and 3 sentences a paragraph; British spelling; abbreviations written out; every source exists; one of each tutorial kind; three check questions with the answers in different places.',
  '',
)
out.push('| # | Structure | Topic | Statements | † |', '|---|---|---|---|---|')

const factsOf = (s) => [
  s.oneLine.main, s.oneLine.simpler, s.oneLine.deeper, ...s.where.facts, s.where.simpler, s.where.deeper, ...s.features.items, s.features.simpler, s.features.deeper,
  ...s.formFunction.facts, s.formFunction.simpler, ...s.relations.items, s.relations.simpler, ...s.development.facts, ...s.variations.facts, ...s.clinical.items, ...s.tutorial.items,
]
lessons.forEach((s, k) => {
  const f = factsOf(s)
  out.push(`| ${k + 1} | ${bones.get(s.bone)} | ${s.topic === 'skull' ? 'Skull' : 'Upper limb'} | ${f.length + s.check.length} | ${f.filter((x) => x.check).length} |`)
})
out.push('')

lessons.forEach((s, k) => {
  const name = bones.get(s.bone)
  out.push('---', '', `## ${k + 1}. ${name}`, '', `*${s.source} · id \`${s.id}\` · bone \`${s.bone}\` · ${s.reviewStatus}*`, '')
  out.push('### 1. In one line', '', `**${line(s.oneLine.main)}**`, '', `*Simpler.* ${line(s.oneLine.simpler)}`, '', `*Deeper.* ${line(s.oneLine.deeper)}`, '')
  out.push('### 2. Where it is', '', ...s.where.facts.map((f) => `- ${line(f)}`), '', `*Simpler.* ${line(s.where.simpler)}`, '', `*Deeper.* ${line(s.where.deeper)}`, '')
  out.push('### 3. Key features', '', ...s.features.items.map((f) => `- **${f.name}.** ${line(f)}`), '', `*Simpler.* ${line(s.features.simpler)}`, '', `*Deeper.* ${line(s.features.deeper)}`, '')
  out.push('### 4. Form → function', '', ...s.formFunction.facts.map((f) => `- ${line(f)}`), '', `*Simpler.* ${line(s.formFunction.simpler)}`, '')
  out.push('### 5. Relations', '', ...s.relations.items.map((f) => `- *${f.kind}* **${f.name}.** ${line(f)}`), '', `*Simpler.* ${line(s.relations.simpler)}`, '')
  out.push('### 6. Development', '', ...s.development.facts.map((f) => `- ${line(f)}`), '')
  out.push('### 7. Variations', '', ...(s.variations.facts.length ? s.variations.facts.map((f) => `- ${line(f)}`) : ['*None from an approved source yet; the app says so.*']), '')
  out.push('### 8. Clinical reasoning', '')
  s.clinical.items.forEach((c, j) => {
    out.push(`${j + 1}. **Injury:** ${c.injury}  `, `   **Damaged:** ${c.damaged}  `, `   **Patient can’t:** ${c.cannotDo}  `, `   **Why:** ${c.why}${dag(c)}${srcOf(c)}`, '')
  })
  out.push('### 9. Tutorial questions', '')
  s.tutorial.items.forEach((t, j) => {
    out.push(`${j + 1}. *${t.kind[0].toUpperCase() + t.kind.slice(1)}.* **${t.q}**${dag(t)}${srcOf(t)}`, '', ...t.model.map((m) => `   - ${m}`), '')
  })
  out.push('### Check yourself', '')
  s.check.forEach((q, j) => {
    out.push(`${j + 1}. ${q.stem}  `, `   ${q.options.map((o, i) => (i === q.answer ? `**${'ABCD'[i]}. ${o}**` : `${'ABCD'[i]}. ${o}`)).join(' · ')}  `, `   *${q.why}*${srcOf(q)}`, '')
  })
  for (const f of factsOf(s)) if (f.check) pending.push(`- **${name}${f.name ? `: ${f.name}` : ''}.** “${f.t ?? f.q ?? f.why}” — ${f.check}`)
})

out.push('---', '', `## Awaiting a source check (${pending.length})`, '', 'Each needs an approved source (OpenStax A&P 2e, or a reviewer) before the lesson can be marked reviewed.', '', ...pending, '')
writeFileSync(join(ROOT, 'docs', 'structures-review.md'), out.join('\n'))
console.log(`docs/structures-review.md: ${lessons.length} lessons, ${pending.length} awaiting a source check`)
