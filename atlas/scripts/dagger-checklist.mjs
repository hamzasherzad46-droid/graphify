// Writes docs/dagger-checklist.md: every statement still marked † (awaiting a source check), for the anatomy reviewer
// to sign off. For each: the statement, where it appears, what is missing, and a proposed source:
//   - Gray's Anatomy (1918), quoted where its text supports the statement (secondary support: it cannot approve on its own);
//   - Terminologia Anatomica (TA2) entries for the names the statement uses (data/sources/terminologia.json);
//   - a current textbook in which to confirm it (named books; no page numbers are invented).
//   node scripts/dagger-checklist.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const bones = new Map(readdirSync(join(ROOT, 'content', 'bones')).map((f) => json('content', 'bones', f)).map((b) => [b.id, b.name]))

/* Gray's 1918 sentences, with their section and paragraph. */
const plain = (x) => (typeof x === 'string' ? x : Array.isArray(x) ? x.map(plain).join('') : x && typeof x === 'object' ? (x.inl ? plain(x.inl) : x.k && typeof x.t === 'string' ? x.t : '') : '')
const grays = []
for (const f of readdirSync(join(ROOT, 'content', 'classic'))) {
  const d = json('content', 'classic', f)
  for (const e of d.entries) for (const b of e.blocks) if (b.inl) for (const s of plain(b.inl).split(/(?<=[.;])\s+(?=[A-Z])/)) grays.push({ section: f.replace(/^s(\d+)-(\d+)\.json$/, '$1.$2'), title: e.title, s })
}
const gray = (re) => grays.find((g) => re.test(g.s))

/* Terminologia Anatomica (TA2) by English name: exact, then "<name> muscle", then any entry that starts with it. */
const TA = json('data', 'sources', 'terminologia.json').terms
const taOf = (entry) => {
  // An entry is a name, or [the name Atlas uses, the name TA2 uses] where they differ.
  const [used, listed] = Array.isArray(entry) ? entry : [entry, entry]
  const n = listed.toLowerCase()
  const t = [n, `${n} muscle`, `${n} bone`].map((k) => TA.find((x) => x.en.toLowerCase() === k)).find(Boolean) ?? TA.find((x) => x.en.toLowerCase().startsWith(`${n} of the `))
  if (!t) return `“${used}”: not found in the Terminologia Anatomica list`
  const code = `TA2 ${(t.ta2.length ? t.ta2 : t.ta98).join(', ')}`
  return used === listed ? `${t.en} (${code})` : `“${used}” is listed as ${t.en} (${code})`
}

const CLINICAL = 'a current clinical anatomy textbook, for example Moore, Dalley and Agur, *Clinically Oriented Anatomy*, or Drake, Vogl and Mitchell, *Gray’s Anatomy for Students*'
const UL = `${CLINICAL} (upper limb chapter)`
const HN = `${CLINICAL} (head and neck chapter)`
const DEV = 'Standring (ed.), *Gray’s Anatomy: The Anatomical Basis of Clinical Practice*, current edition (development and ossification), or a skeletal-maturation atlas (Greulich and Pyle)'
const ORTHO = '*Apley and Solomon’s System of Orthopaedics and Trauma*, current edition, or ' + CLINICAL
const NEURO = `${CLINICAL} (head and neck chapter), or a neurology or neurosurgery text for the clinical point`

/**
 * Proposed sources, by the start of the statement. `gray`: a pattern for the Gray's 1918 sentence that supports it;
 * `ta`: the names it uses; `book`: where to confirm it.
 */
const P = [
  ['Winds around the surgical neck', { ta: ['axillary nerve'], book: UL }],
  ['Lies in the radial (spiral) groove', { gray: /radial sulcus, directed obliquely/, ta: ['radial nerve'], book: UL }],
  ['Passes behind the medial epicondyle', { gray: /medial epicondyle, larger and more prominent/, ta: ['ulnar nerve'], book: UL }],
  ['A few people have a small hook of bone', { ta: ['median nerve'], book: UL }],
  ['A fracture of the middle of the shaft', { gray: /radial sulcus, directed obliquely/, ta: ['radial nerve'], book: UL }],
  ['A child falls on an outstretched hand', { book: ORTHO }],
  ['Predict the deficit if the radial nerve', { gray: /radial sulcus, directed obliquely/, ta: ['radial nerve', 'triceps brachii'], book: UL }],
  ['A notch in the top border', { gray: /passage of the suprascapular nerve/, ta: ['suprascapular nerve', 'suprascapular notch'], book: UL }],
  ['Supplies serratus anterior', { gray: /attachment to the Serratus anterior/, ta: ['long thoracic nerve', 'serratus anterior'], book: UL, note: 'The Gray’s sentence supports the muscle’s attachment to the scapula only, not its nerve.' }],
  ['In some adults part of the acromion', { gray: /Failure of bony union between the acromion/, book: `${UL}; or an imaging text for its appearance on X-ray` }],
  ['Injury to the long thoracic nerve', { ta: ['long thoracic nerve', 'serratus anterior'], book: UL }],
  ['The narrow middle part. Most fractures', { ta: ['scaphoid'], book: ORTHO }],
  ['Its branches enter mainly at the far', { ta: ['radial artery', 'scaphoid'], book: ORTHO }],
  ['It lies in the floor of this hollow', { ta: ['anatomical snuff box'], book: UL }],
  ['Its ossification centre appears', { gray: /ossification proceeds in the following order/, book: DEV, note: 'Gray’s 1918 gives the sixth year for the scaphoid (its “navicular”); Atlas says about five years. Please confirm which is right.' }],
  ['Predict which part of the scaphoid dies', { book: ORTHO }],
  ['Openings in the floor of the middle fossa', { gray: /It is pierced by the foramen ovale and foramen spinosum/, ta: ['foramen rotundum', 'foramen ovale', 'foramen spinosum'], book: HN }],
  ['Leaves through the foramen rotundum', { gray: /foramen rotundum, for the transmission of the maxillary nerve/, ta: ['maxillary nerve', 'foramen rotundum'], book: HN }],
  ['Enters through the foramen spinosum', { gray: /foramen spinosum, which transmits the middle meningeal/, ta: ['middle meningeal artery', 'foramen spinosum'], book: HN }],
  ['The size of the sphenoid sinus varies', { gray: /They vary considerably in form and size, are seldom symmetrical/, ta: ['sphenoidal sinus'], book: HN }],
  ['The nerve to the lower teeth: enters', { gray: /mandibular foramen, for the entrance of the inferior alveolar/, ta: ['inferior alveolar nerve', 'mandibular foramen'], book: HN }],
  ['Like other flat bones of the face, most of it', { gray: /The mandible is ossified in the fibrous membrane/, book: DEV }],
  ['In males the angle of the mandible', { book: `${HN}, or a forensic anthropology text on sex estimation from the skull` }],
  ['Because the sphenoid sinus lies just in front', { ta: ['sphenoidal sinus', 'sella turcica'], book: NEURO }],
  ['“Sphenoid” comes from the Greek', { book: 'the *Oxford English Dictionary*, entry “sphenoid” (etymology)' }],
  ['Raised pressure inside the skull can push', { ta: ['foramen magnum'], book: NEURO }],
  ['The pterion is where four skull bones meet', { gray: /deep groove, sometimes a canal, for the anterior divisions of the middle meningeal artery/, ta: ['middle meningeal artery'], book: HN }],
  ['The artery enters the skull through the foramen spinosum', { gray: /foramen spinosum, which transmits the middle meningeal/, ta: ['middle meningeal artery', 'foramen spinosum'], book: HN }],
  ['It is a branch of the maxillary artery', { ta: ['maxillary artery', 'middle meningeal artery'], book: HN }],
  ['A torn artery bleeds between the skull and the dura', { ta: ['epidural space'], book: NEURO }],
  ['An extradural haematoma is usually arterial', { book: NEURO }],
  ['A fracture through the cribriform plate', { ta: ['cribriform plate', 'olfactory nerve'], book: NEURO }],
  ['The scaphoid links the proximal and distal rows', { ta: ['anatomical snuff box'], book: UL }],
  ['The scaphoid is the wrist bone on the thumb side', { ta: ['anatomical snuff box'], book: UL }],
  ['Its blood supply (from branches of the radial artery)', { ta: ['radial artery'], book: ORTHO }],
  ['So a fracture across the waist', { book: ORTHO }],
  ['Risk: avascular necrosis and non-union', { book: ORTHO }],
  ['The ulnar nerve runs in a shallow groove', { gray: /medial epicondyle, larger and more prominent/, ta: ['ulnar nerve'], book: UL }],
  ['The nerve passes right behind the bony bump', { ta: ['ulnar nerve'], book: UL }],
  ['The nerve enters the forearm between the two heads', { ta: ['ulnar nerve', 'flexor carpi ulnaris'], book: UL }],
  ['It supplies most of the small (intrinsic) muscles', { ta: ['ulnar nerve'], book: UL }],
  ['It gives sensation to the little finger', { ta: ['ulnar nerve'], book: UL }],
  ['A fracture of the medial epicondyle, or long pressure', { ta: ['ulnar nerve'], book: UL }],
  ['The “funny bone” is not a bone', { ta: ['ulnar nerve'], book: UL }],
  ['Only the ulnar nerve lies behind the medial epicondyle', { ta: ['ulnar nerve', 'median nerve'], book: UL }],
  ['The surgical neck is where the expanded upper end', { ta: ['axillary nerve', 'surgical neck'], book: UL }],
  ['The surgical neck is the narrow part', { ta: ['axillary nerve'], book: UL }],
  ['The posterior circumflex humeral artery', { ta: [['posterior circumflex humeral artery', 'posterior humeral circumflex artery'], 'axillary nerve'], book: UL }],
  ['The axillary nerve supplies the deltoid', { ta: ['axillary nerve', 'deltoid', 'teres minor'], book: UL }],
  ['It supplies the skin over the lower deltoid', { ta: ['axillary nerve'], book: UL }],
  ['Lower down, the radial nerve lies in the radial groove', { gray: /radial sulcus, directed obliquely/, ta: ['radial nerve'], book: UL }],
  ['Damage to the axillary nerve weakens the deltoid', { ta: ['axillary nerve', 'deltoid'], book: UL }],
  ['Carries nine tendons from three muscles', { ta: ['carpal tunnel', 'median nerve'], book: UL }],
  ['Flexor digitorum superficialis (four)', { ta: ['flexor digitorum superficialis', 'flexor digitorum profundus', 'flexor pollicis longus'], book: UL }],
  ['Swelling in the tunnel compresses the median nerve', { ta: ['carpal tunnel', 'median nerve'], book: UL }],
]
const proposalFor = (t) => P.find(([start]) => t.startsWith(start))?.[1]

/** For a statement with no hand-made proposal: the textbook for its topic, and Gray's where the check already cites it. */
function defaultProposal(it) {
  const book = it.topic === 'skull' ? HN : UL
  if (/Gray’s 1918 \(8\.2\)/.test(it.missing)) return { gray: /ossification proceeds in the following order/, book: DEV }
  if (/osteoarthritis|fracture|breaks|dislocat/i.test(it.text)) return { book: ORTHO }
  return { book }
}

/* Every † statement, in reading order. */
const LAYER = { oneLine: 'In one line', where: 'Where it is', features: 'Key features', formFunction: 'Form → function', relations: 'Relations', development: 'Development', variations: 'Variations', clinical: 'Clinical reasoning', tutorial: 'Tutorial questions' }
const items = []
const SAMPLES = ['humerus', 'scapula', 'scaphoid', 'sphenoid', 'mandible']
const ids = readdirSync(join(ROOT, 'content', 'structures')).map((f) => f.replace('.json', ''))
const order = [...SAMPLES, ...ids.filter((x) => !SAMPLES.includes(x)).sort((a, b) => (bones.get(json('content', 'structures', `${a}.json`).bone) ?? a).localeCompare(bones.get(json('content', 'structures', `${b}.json`).bone) ?? b))]
for (const id of order) {
  const s = json('content', 'structures', `${id}.json`)
  const name = bones.get(s.bone)
  for (const [layer, label] of Object.entries(LAYER)) {
    const v = s[layer]
    const list = [...(v.items ?? []), ...(v.facts ?? []), ...['main', 'simpler', 'deeper'].map((k) => v[k]).filter(Boolean)]
    list.forEach((f) => {
      if (!f.check) return
      const text = f.q ?? (f.injury ? `Injury: ${f.injury} Damaged: ${f.damaged} Patient can’t: ${f.cannotDo} Why: ${f.why}` : f.name ? `${f.name}: ${f.t}` : f.t)
      items.push({ text, key: f.q ?? f.injury ?? f.t, where: `Structure lesson: ${name}, layer “${label}”`, missing: f.check, topic: s.topic })
    })
  }
}
const cards = ['skull', 'upper-limb'].flatMap((t) => json('content', 'cards', `${t}.json`).cards)
const CARD_LAYER = { why: 'Why', simpler: 'Explain simpler', depth: 'Go deeper', clinical: 'Clinical', hook: 'Memory hook', trap: 'Exam trap' }
cards.forEach((c, k) => {
  for (const [layer, label] of Object.entries(CARD_LAYER)) {
    const list = Array.isArray(c[layer]) ? c[layer] : c[layer] ? [c[layer]] : []
    list.forEach((f, j) => {
      if (f.check) items.push({ text: f.t, key: f.t, topic: c.topic, where: `Flashcard 2.${k + 1} (“${c.front}”), layer “${label}”${list.length > 1 ? `, point ${j + 1}` : ''}`, missing: f.check })
    })
  }
})

/* The file. */
const L = []
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
L.push(
  '# Atlas: † statements for sign-off',
  '',
  `${today}. ${items.length} statements are marked † in the app: not confirmed by the imported OpenStax A&P 2e chapters (6–9, 12–16 and 20) or by review. Each stays marked until it is signed off here.`,
  '',
  '**Proposed sources.** For each statement: any sentence of *Gray’s Anatomy* (1918) that supports it, quoted in full (a secondary source: it can support a statement but cannot approve one on its own); the Terminologia Anatomica (TA2) entry for each name it uses; and a current textbook in which to confirm it. No page numbers are given: please record the edition and page you use.',
  '',
  '**To sign off**, tick one box for each statement and record the source. *Confirmed*: Atlas removes the † and records your source. *Change*: write the correct wording. *Remove*: Atlas deletes the statement.',
  '',
)
items.forEach((it, k) => {
  const p = proposalFor(it.key) ?? defaultProposal(it)
  const g = p?.gray ? gray(p.gray) : null
  L.push(`### ${k + 1}. ${esc(it.where)}`, '', `> ${esc(it.text)}`, '', `- **What is missing:** ${esc(it.missing)}`)
  if (p?.gray) L.push(g ? `- **Gray’s 1918** (${g.section}, “${esc(g.title)}”; supporting only): “${esc(g.s)}”` : '- **Gray’s 1918:** no supporting sentence found.')
  else L.push('- **Gray’s 1918:** no supporting sentence in the imported chapters.')
  if (p?.ta?.length) L.push(`- **Terminologia Anatomica:** ${p.ta.map(taOf).map(esc).join('; ')}`)
  L.push(`- **Confirm in:** ${p?.book ?? 'no source proposed yet'}`)
  if (p?.note) L.push(`- **Note:** ${esc(p.note)}`)
  L.push('', '☐ Confirmed  ☐ Change  ☐ Remove  Source (edition, page): ____________________  Initials and date: ________', '')
})
writeFileSync(join(ROOT, 'docs', 'dagger-checklist.md'), L.join('\n'))
console.log(`docs/dagger-checklist.md: ${items.length} statements`)
