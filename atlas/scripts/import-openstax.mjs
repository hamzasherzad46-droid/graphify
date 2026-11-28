// Imports chapters 6–9 (skeletal system), 10–11 (muscle tissue and the muscular system), 12–16 (nervous system),
// 17 (endocrine system), 19–20 (heart, blood vessels and circulation), 21 (lymphatic and immune system),
// 22 (respiratory system), 23 (digestive system) and 25 (urinary system) of OpenStax Anatomy and Physiology 2e into
// content/textbook/ as
// structured JSON, with figures re-encoded to public/textbook/.
//
// Source and licence: the book's source repository (github.com/openstax/osbooks-anatomy-physiology) at commit PIN,
// the last commit released under CC BY 4.0 (the repository moved to CC BY-NC-SA 4.0 on 2026-03-19, commit fdfa6e2;
// a CC licence cannot be withdrawn from material already released under it). Everything here is taken from PIN.
//
//   node scripts/import-openstax.mjs            # fetches the CNXML and images (cached in .cache/openstax)
//   node scripts/import-openstax.mjs --report   # also prints the bone links and unlinked terms for review
import { DOMParser } from '@xmldom/xmldom'
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { linker } from './lib/bonelink.mjs'
import { normaliseDeep, summary as spellingSummary } from './lib/textnorm.mjs'
import { firstUses, sectionParts } from './lib/abbreviations.mjs'

export const PIN = 'b0058a743bdd2cc08196abaaa7d5469970c0d80c'
const RAW = `https://raw.githubusercontent.com/openstax/osbooks-anatomy-physiology/${PIN}`
const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, '.cache', 'openstax')
const OUT = join(ROOT, 'content', 'textbook')
const MEDIA = join(ROOT, 'public', 'textbook')
const REPORT = process.argv.includes('--report')

/** Chapters in book order: [module, Atlas topic]. The first module of each chapter is its introduction. */
const CHAPTERS = [
  { num: 6, title: 'Bone Tissue and the Skeletal System', modules: [['m46290', 'bone-tissue'], ['m46341', 'bone-tissue'], ['m46282', 'bone-tissue'], ['m46281', 'bone-tissue'], ['m46301', 'bone-tissue'], ['m46342', 'bone-tissue'], ['m46305', 'bone-tissue'], ['m46295', 'bone-tissue']] },
  { num: 7, title: 'Axial Skeleton', modules: [['m46347', 'skeleton'], ['m46344', 'skeleton'], ['m46355', 'skull'], ['m46352', 'spine'], ['m46350', 'thorax'], ['m46348', 'skeleton']] },
  { num: 8, title: 'The Appendicular Skeleton', modules: [['m46370', 'skeleton'], ['m46374', 'upper-limb'], ['m46368', 'upper-limb'], ['m46375', 'pelvis'], ['m46364', 'lower-limb'], ['m46376', 'skeleton']] },
  { num: 9, title: 'Joints', modules: [['m46402', 'joints'], ['m46383', 'joints'], ['m46403', 'joints'], ['m46381', 'joints'], ['m46394', 'joints'], ['m46398', 'joints'], ['m46377', 'joints'], ['m46388', 'joints']] },
  // The muscles (chapters 10–11), read with the male layered model.
  { num: 10, title: 'Muscle Tissue', modules: [['m46450', 'muscle-tissue'], ['m46473', 'muscle-tissue'], ['m46476', 'muscle-tissue'], ['m46447', 'muscle-tissue'], ['m46470', 'muscle-tissue'], ['m46480', 'muscle-tissue'], ['m46438', 'muscle-tissue'], ['m46404', 'muscle-tissue'], ['m46478', 'muscle-tissue'], ['m46407', 'muscle-tissue']] },
  { num: 11, title: 'The Muscular System', modules: [['m46492', 'muscles'], ['m46487', 'muscles'], ['m46498', 'muscles'], ['m46484', 'muscles'], ['m46485', 'muscles'], ['m46495', 'muscles'], ['m46482', 'muscles']] },
  // Sources for the layered flashcards' nerve and vessel statements (read in the Textbook; no exam questions by region).
  { num: 12, title: 'The Nervous System and Nervous Tissue', modules: [['m46504', 'nervous'], ['m46500', 'nervous'], ['m46509', 'nervous'], ['m46531', 'nervous'], ['m46526', 'nervous'], ['m46503', 'nervous']] },
  { num: 13, title: 'Anatomy of the Nervous System', modules: [['m46528', 'nervous'], ['m46535', 'nervous'], ['m46533', 'nervous'], ['m46719', 'nervous'], ['m46553', 'nervous']] },
  { num: 14, title: 'The Somatic Nervous System', modules: [['m46561', 'nervous'], ['m46577', 'nervous'], ['m46557', 'nervous'], ['m46574', 'nervous']] },
  { num: 15, title: 'The Autonomic Nervous System', modules: [['m46590', 'nervous'], ['m46582', 'nervous'], ['m46579', 'nervous'], ['m46581', 'nervous'], ['m46587', 'nervous']] },
  { num: 16, title: 'The Neurological Exam', modules: [['m46593', 'nervous'], ['m46594', 'nervous'], ['m46650', 'nervous'], ['m46607', 'nervous'], ['m46640', 'nervous'], ['m46604', 'nervous']] },
  // The organs (and, in chapter 20, the vessels), read with the male organ model.
  { num: 17, title: 'The Endocrine System', modules: [['m46682', 'endocrine'], ['m46656', 'endocrine'], ['m46667', 'endocrine'], ['m46699', 'endocrine'], ['m46700', 'endocrine'], ['m46687', 'endocrine'], ['m46684', 'endocrine'], ['m46693', 'endocrine'], ['m46670', 'endocrine'], ['m46685', 'endocrine'], ['m46680', 'endocrine'], ['m46658', 'endocrine']] },
  { num: 19, title: 'The Cardiovascular System: The Heart', modules: [['m46679', 'heart'], ['m46676', 'heart'], ['m46664', 'heart'], ['m46661', 'heart'], ['m46672', 'heart'], ['m46673', 'heart']] },
  { num: 20, title: 'The Cardiovascular System: Blood Vessels and Circulation', modules: [['m46600', 'vessels'], ['m46597', 'vessels'], ['m46635', 'vessels'], ['m46586', 'vessels'], ['m46603', 'vessels'], ['m46646', 'vessels'], ['m46610', 'vessels']] },
  { num: 21, title: 'The Lymphatic and Immune System', modules: [['m46573', 'lymphatic'], ['m46563', 'lymphatic'], ['m46571', 'lymphatic'], ['m46560', 'lymphatic'], ['m46558', 'lymphatic'], ['m46569', 'lymphatic'], ['m46566', 'lymphatic'], ['m46583', 'lymphatic']] },
  { num: 22, title: 'The Respiratory System', modules: [['m46523', 'respiratory'], ['m46548', 'respiratory'], ['m46551', 'respiratory'], ['m46549', 'respiratory'], ['m46521', 'respiratory'], ['m46545', 'respiratory'], ['m46524', 'respiratory'], ['m46518', 'respiratory']] },
  { num: 23, title: 'The Digestive System', modules: [['m46505', 'digestive'], ['m46506', 'digestive'], ['m46502', 'digestive'], ['m46511', 'digestive'], ['m46517', 'digestive'], ['m46512', 'digestive'], ['m46496', 'digestive'], ['m46501', 'digestive']] },
  { num: 25, title: 'The Urinary System', modules: [['m46430', 'urinary'], ['m46432', 'urinary'], ['m46427', 'urinary'], ['m46429', 'urinary'], ['m46431', 'urinary'], ['m46433', 'urinary'], ['m46443', 'urinary'], ['m46435', 'urinary'], ['m46424', 'urinary'], ['m46434', 'urinary'], ['m46446', 'urinary']] },
]

/** What Atlas changed, listed at the end of every section (CC BY 4.0 asks for changes to be indicated). */
const CHANGES = [
  'Atlas groups the sections by topic.',
  'Atlas shows each section’s chapter review summary at its top as key points: the first sentence of each summary paragraph, with the rest of the paragraph one tap away.',
  'Spelling follows British English (for example haemorrhage, fibre, colour), with one form for each word across Atlas (for example brainstem, anteroposterior).',
  'Typing errors in the source are corrected; each correction is listed in Atlas’s spelling dictionary.',
  'Each abbreviation is written out in full the first time it appears in the section (for example, central nervous system (CNS)).',
  'Links to videos, interactive exercises and external websites are removed.',
  'Three review questions per section appear as a quick check; the other review and critical thinking questions appear among the exam-style questions.',
  'Bone names and bone landmarks link to the Atlas 3D model.',
  'Atlas resizes and re-encodes the figures for the web; their content is unchanged.',
  'Otherwise, the text, figures, captions and key terms are as published.',
]

async function cached(path, binary = false) {
  const file = join(CACHE, path.replace(/^\.\.\/\.\.\//, '').replace(/\//g, '__'))
  if (!existsSync(file)) {
    mkdirSync(CACHE, { recursive: true })
    let res
    // GitHub rate-limits bursts of downloads (429): wait and try again, longer each time.
    for (let attempt = 0; ; attempt++) {
      res = await fetch(`${RAW}/${path.replace(/^\.\.\/\.\.\//, '')}`)
      if (res.status !== 429 || attempt >= 8) break
      await new Promise((r) => setTimeout(r, 5000 * 2 ** Math.min(attempt, 4)))
    }
    if (!res.ok) throw new Error(`${res.status} ${path}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return binary ? readFileSync(file) : readFileSync(file, 'utf8')
}

const els = (n) => [...(n?.childNodes ?? [])].filter((c) => c.nodeType === 1)
const child = (n, name) => els(n).find((c) => c.localName === name)
const children = (n, name) => els(n).filter((c) => c.localName === name)
const clean = (s) => s.replace(/\s+/g, ' ')
const textOf = (n) => clean(n?.textContent ?? '').trim()

/* ── Inline content ─────────────────────────────────────────────────────────────────────────────────────────── */
// Inline = string | { k: 'term' | 'em' | 'strong' | 'sup' | 'sub', t: string } | { k: 'ref', t: string, to: id }

/**
 * MathML as readable text (the textbook shows formulas inline): a fraction as "(top) ÷ (bottom)", a power with
 * superscript digits (r⁴), subscripts as subscript digits with charges raised (H₂CO₃, HCO₃⁻), a label over an arrow
 * in brackets after it ("↔ (CA)"), and the rows of a table separated by semicolons. Sections 17.2, 20.2, 22.3, 22.5,
 * 25.6 and 25.9 use MathML.
 */
const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '⁺', '−': '⁻' }
const script = (t, map) => [...t.replace(/\s+/g, '')].map((ch) => map[ch] ?? ch).join('')
const ARROW = /^[↔→←⇌]$/
function mathText(n) {
  const kids = () => els(n).map(mathText)
  const wrap = (t) => (/^[\p{L}\d²³⁴]+$/u.test(t) ? t : `(${t.replace(/^\((.*)\)$/, '$1')})`)
  switch (n.localName) {
    case 'mfrac': {
      const [top, bottom] = kids()
      return `${wrap(top)} ÷ ${wrap(bottom)}`
    }
    case 'msup': {
      const [b, e] = kids()
      // An arrow with a label, set as a superscript in the source (22.5: "O" followed by "↔" labelled CA).
      if (n.getElementsByTagName('m:munder').length || n.getElementsByTagName('m:mover').length) return `${b} ${e}`
      return `${b}${script(e, SUPER)}`
    }
    case 'msub': {
      const [b, e] = kids()
      return `${b}${script(e, SUB)}`
    }
    case 'msubsup': {
      const [b, lo, hi] = kids()
      return `${b}${script(lo, SUB)}${script(hi, SUPER)}`
    }
    case 'munder':
    case 'mover': {
      const [base, label] = kids()
      return ARROW.test(label) ? `${label} (${base})` : ARROW.test(base) ? `${base} (${label})` : `${base} ${label}`
    }
    case 'mtable':
      // Rows, with a row that is just "or" read as a word between the others.
      return els(n).map(mathText).filter(Boolean).join('; ').replace(/; or; /g, ', or ')
    case 'mtext':
    case 'mi':
    case 'mn':
    case 'mo':
      return (n.textContent ?? '').replace(/\u00a0/g, ' ').replace(/-/g, ' − ').replace(/\s+/g, ' ').trim()
    default:
      // Parts of one chemical formula join up ("H₂" "O" → "H₂O"); other parts are spaced.
      return kids()
        .filter(Boolean)
        .reduce((a, t) => (a && /[A-Za-z₀-₉⁺⁻]$/.test(a) && /^[A-Z]/.test(t) ? a + t : a ? `${a} ${t}` : t), '')
        .replace(/\s+/g, ' ')
        .replace(/\( /g, '(')
        .replace(/ \)/g, ')')
        .trim()
  }
}

function inline(node, ctx) {
  const out = []
  const push = (x) => {
    if (typeof x === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += x
    else out.push(x)
  }
  for (const c of node.childNodes ?? []) {
    if (c.nodeType === 3) {
      // A word run straight on after a key term ("quadratus femoris</term>laterally", 11.6) gets its space back.
      const t = clean(c.data)
      // So does a word run straight on after a numeric subscript ("CO<sub>2</sub>to be released", 22.1).
      const runOn = (c.previousSibling?.localName === 'term' || (c.previousSibling?.localName === 'sub' && /^\d+$/.test(textOf(c.previousSibling)))) && /^[a-z]{2}/.test(t)
      push(runOn ? ` ${t}` : t)
    }
    else if (c.nodeType !== 1) continue
    else if (c.localName === 'term') push({ k: 'term', t: textOf(c) })
    else if (c.localName === 'emphasis') {
      // Spaces at the edge of an emphasis ("<emphasis>not </emphasis>activate") belong to the text around it.
      const raw = clean(c.textContent ?? '')
      if (/^\s/.test(raw)) push(' ')
      push({ k: c.getAttribute('effect') === 'bold' ? 'strong' : 'em', t: raw.trim() })
      if (/\s$/.test(raw)) push(' ')
    }
    else if (c.localName === 'sup' || c.localName === 'sub') {
      // An empty superscript stands for a space in the source ("lumen<sup> </sup>into", 25.6).
      if (textOf(c)) push({ k: c.localName, t: textOf(c) })
      else if (/\s/.test(c.textContent ?? '')) push(' ')
    }
    else if (c.localName === 'link') {
      const t = textOf(c)
      const target = c.getAttribute('target-id')
      if (c.getAttribute('url')) push(t) // external link: keep the words, drop the link
      else if (target && ctx.labels.has(target)) push({ k: 'ref', t: t || ctx.labels.get(target), to: target })
      else if (c.getAttribute('document')) push(t || ctx.docTitle(c.getAttribute('document')))
      else push(t)
    } else if (c.localName === 'math') push(mathText(c))
    else if (c.localName === 'newline') push(' ')
    else for (const x of inline(c, ctx)) push(x)
  }
  // Tidy whitespace at the edges.
  if (typeof out[0] === 'string') out[0] = out[0].replace(/^\s+/, '')
  if (typeof out[out.length - 1] === 'string') out[out.length - 1] = out[out.length - 1].replace(/\s+$/, '')
  return out.filter((x) => x !== '')
}

/* ── Blocks ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const SKIP_SECTIONS = new Set(['summary', 'multiple-choice', 'free-response', 'interactive-exercise', 'references'])
const NOTE_KINDS = { 'anatomy disorders': 'Disorders of the…', 'anatomy diseases': 'Diseases of the…', 'anatomy homeostatic': 'Homeostatic imbalances', 'anatomy aging': 'Aging and the…', 'anatomy career': 'Career connection', 'anatomy everyday': 'Everyday connection' }

function blocks(node, ctx, level = 2) {
  const out = []
  for (const c of els(node)) {
    const id = c.getAttribute('id')
    switch (c.localName) {
      case 'para': {
        const inl = inline(c, ctx)
        if (inl.length) out.push({ t: 'p', id, inl })
        break
      }
      case 'equation': {
        // A formula on its own line (section 20.2: Poiseuille’s equation and its rearrangements).
        const math = c.getElementsByTagName('m:math')[0] ?? [...c.getElementsByTagName('*')].find((e) => e.localName === 'math')
        const text = math ? mathText(math) : textOf(c)
        if (text) out.push({ t: 'p', id, inl: [text] })
        break
      }
      case 'list':
        out.push({ t: 'list', id, ordered: c.getAttribute('list-type') === 'enumerated', items: children(c, 'item').map((i) => inline(i, ctx)) })
        break
      case 'figure': {
        const image = c.getElementsByTagName('image')[0]
        const media = c.getElementsByTagName('media')[0]
        if (!image) break
        const src = image.getAttribute('src')
        ctx.images.add(src)
        out.push({
          t: 'fig',
          id,
          label: ctx.labels.get(id),
          title: textOf(child(c, 'title')),
          src: `textbook/${webpName(src)}`,
          alt: media?.getAttribute('alt') ?? '',
          caption: child(c, 'caption') ? inline(child(c, 'caption'), ctx) : [],
        })
        break
      }
      case 'table': {
        const tg = child(c, 'tgroup')
        const rows = (sec) => (sec ? children(sec, 'row').map((r) => children(r, 'entry').map((e) => inline(e, ctx))) : [])
        out.push({ t: 'table', id, label: ctx.labels.get(id), title: textOf(child(c, 'title')), head: rows(child(tg, 'thead')), rows: rows(child(tg, 'tbody')) })
        break
      }
      case 'note': {
        const cls = c.getAttribute('class') ?? ''
        if (cls.includes('interactive')) break // links to videos and external sites
        const title = textOf(child(c, 'title'))
        const inner = blocks(c, ctx, level + 1)
        if (inner.length) out.push({ t: 'note', id, kind: cls.replace('anatomy ', ''), label: NOTE_KINDS[cls] ?? '', title, blocks: inner })
        break
      }
      case 'section': {
        const cls = c.getAttribute('class') ?? ''
        if (SKIP_SECTIONS.has(cls)) break
        const title = textOf(child(c, 'title'))
        if (title) out.push({ t: 'h', id, level: Math.min(level, 4), text: title })
        out.push(...blocks(c, ctx, level + 1))
        break
      }
      case 'title':
      case 'label':
      case 'metadata':
        break
      default:
        out.push(...blocks(c, ctx, level))
    }
  }
  return out
}

const webpName = (src) => src.replace(/^.*\//, '').replace(/\.[a-z]+$/i, '').replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/-+$/, '') + '.webp'

/* ── Questions ──────────────────────────────────────────────────────────────────────────────────────────────── */

function questions(doc, ctx) {
  const mc = []
  const free = []
  for (const sec of [...doc.getElementsByTagName('section')]) {
    const cls = sec.getAttribute('class')
    if (cls !== 'multiple-choice' && cls !== 'free-response') continue
    for (const ex of children(sec, 'exercise')) {
      const problem = child(ex, 'problem')
      const solution = child(ex, 'solution')
      const stem = children(problem, 'para').map((p) => inline(p, ctx))
      const list = child(problem, 'list')
      if (cls === 'multiple-choice' && list) {
        const letter = textOf(solution).replace(/[^A-Z]/g, '').charAt(0)
        mc.push({ id: ex.getAttribute('id'), stem: stem.flat(), options: children(list, 'item').map((i) => inline(i, ctx)), answer: letter.charCodeAt(0) - 65 })
      } else if (cls === 'free-response') {
        free.push({ id: ex.getAttribute('id'), stem: stem.flat(), answer: children(solution, 'para').map((p) => inline(p, ctx)) })
      }
    }
  }
  return { mc: mc.filter((q) => q.answer >= 0 && q.answer < q.options.length), free }
}

/** A paragraph's plain text, with subscripts and superscripts that are digits or charges as script characters (CO₂). */
function scriptText(p) {
  const walk = (n) =>
    [...(n.childNodes ?? [])]
      .map((c) => {
        if (c.nodeType === 3) return c.data
        if (c.nodeType !== 1) return ''
        if (c.localName === 'math') return mathText(c)
        const t = walk(c)
        const map = c.localName === 'sub' ? SUB : c.localName === 'sup' ? SUPER : null
        return map && /^[\d+−-]+$/.test(t.trim()) ? script(t.replace(/-/g, '−'), map) : t
      })
      .join('')
  return clean(walk(p)).trim()
}

/** The chapter review summary as key points: each paragraph's first sentence, with the rest of it kept for "more". */
function keyPoints(doc) {
  const sec = [...doc.getElementsByTagName('section')].find((s) => s.getAttribute('class') === 'summary')
  if (!sec) return []
  return children(sec, 'para').map((p) => {
    const [lead, ...rest] = scriptText(p).split(/(?<=[.!?])\s+(?=[A-Z(])/)
    return { id: p.getAttribute('id'), lead: [lead], rest: rest.length ? [rest.join(' ')] : [] }
  })
}

/* ── Main ───────────────────────────────────────────────────────────────────────────────────────────────────── */

const titles = new Map()
const docs = new Map()
for (const ch of CHAPTERS)
  for (const [m] of ch.modules) {
    const doc = new DOMParser().parseFromString(await cached(`modules/${m}/index.cnxml`), 'text/xml')
    docs.set(m, doc)
    titles.set(m, textOf(doc.getElementsByTagName('title')[0]))
  }

const link = linker(JSON.parse(readFileSync(join(ROOT, 'content', 'landmarks.json'), 'utf8')).landmarks)
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(MEDIA, { recursive: true })
const index = []
let abbrWritten = 0
const abbrMissing = []
const allImages = new Set()
const sectionNumber = new Map()
for (const ch of CHAPTERS) ch.modules.forEach(([m], k) => sectionNumber.set(m, k === 0 ? `${ch.num}` : `${ch.num}.${k}`))

for (const ch of CHAPTERS) {
  // Figures and tables are numbered through the chapter, as in the book.
  const labels = new Map()
  let fig = 0
  for (const [m] of ch.modules) {
    for (const f of [...docs.get(m).getElementsByTagName('figure')]) labels.set(f.getAttribute('id'), `Figure ${ch.num}.${++fig}`)
    for (const t of [...docs.get(m).getElementsByTagName('table')]) {
      const n = (t.getAttribute('id') ?? '').match(/_(\d+)$/)
      if (n) labels.set(t.getAttribute('id'), `Table ${ch.num}.${Number(n[1])}`)
    }
  }
  ch.modules.forEach(([m, topic], k) => {
    // Vertebra codes (C1–L5) are linked only after "vertebra" where they usually name something else: spinal nerves and
    // cord levels in the nervous system chapters, complement proteins in chapter 21.
    link.setMode({ nerves: topic === 'nervous' || topic === 'lymphatic' })
    const doc = docs.get(m)
    const ctx = { labels, images: new Set(), docTitle: (d) => (titles.has(d) ? `${sectionNumber.get(d)} ${titles.get(d)}` : '') }
    const meta = doc.getElementsByTagName('metadata')[0]
    const abstract = meta.getElementsByTagName('md:abstract')[0]
    const objectives = abstract ? [...abstract.getElementsByTagName('item')].map((i) => inline(i, ctx)) : []
    const content = doc.getElementsByTagName('content')[0]
    const body = link.blocks(blocks(content, ctx))
    const glossary = [...doc.getElementsByTagName('definition')].map((d) => ({ term: textOf(child(d, 'term')), meaning: textOf(child(d, 'meaning')) }))
    const q = questions(doc, ctx)
    const num = sectionNumber.get(m)
    const id = k === 0 ? `ch${ch.num}` : `s${ch.num}-${k}`
    const section = normaliseDeep(
      {
      id,
      num,
      title: k === 0 ? 'Introduction' : titles.get(m),
      chapter: { num: ch.num, title: ch.title },
      topic,
      objectives: link.inlines(objectives),
      keyPoints: keyPoints(doc).map((k) => ({ ...k, lead: link.inline(k.lead), rest: link.inline(k.rest) })),
      blocks: body,
      glossary,
      quickCheck: q.mc.slice(0, 3).map((x) => ({ ...x, stem: link.inline(x.stem), options: x.options.map(link.inline) })),
      review: q.mc.slice(3),
      critical: q.free,
      source: {
        book: 'Anatomy and Physiology 2e',
        publisher: 'OpenStax',
        module: m,
        uuid: meta.getElementsByTagName('md:uuid')[0]?.textContent ?? '',
        commit: PIN,
        license: 'CC BY 4.0',
        url: 'https://openstax.org/details/books/anatomy-and-physiology-2e',
      },
      },
      'openstax',
    )
    section.changes = CHANGES
    const abbr = firstUses(sectionParts(section), { fix: true })
    abbrWritten += abbr.written.length
    for (const u of abbr.undefined) abbrMissing.push(`${id} ${u.token}: …${u.context}…`)
    writeFileSync(join(OUT, `${id}.json`), JSON.stringify(section))
    for (const i of ctx.images) allImages.add(i)
    index.push({ id, num, title: section.title, chapter: ch.num, chapterTitle: ch.title, topic, keyPoints: section.keyPoints.length, figures: body.filter((b) => b.t === 'fig').length, words: JSON.stringify(body).split(/\s+/).length, bones: link.bonesIn(body) })
  })
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ source: { commit: PIN, license: 'CC BY 4.0' }, sections: index }, null, 1))

// Figures: max 1100 px wide, WebP.
const have = new Set(existsSync(MEDIA) ? readdirSync(MEDIA) : [])
let bytes = 0
for (const src of allImages) {
  const name = webpName(src)
  const out = join(MEDIA, name)
  if (!have.has(name)) {
    const img = await cached(src, true)
    // failOn 'none': Figure 22.12's JPEG lacks its end marker in the source, though the picture is complete.
    await sharp(img, { failOn: 'none' }).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out)
  }
  bytes += readFileSync(out).length
  have.delete(name)
}
for (const stale of have) rmSync(join(MEDIA, stale))
console.log(`${index.length} sections, ${allImages.size} figures (${(bytes / 1e6).toFixed(1)} MB); ${spellingSummary()}; abbreviations written out: ${abbrWritten}`)
if (abbrMissing.length) console.log(`No full form for:\n  ${abbrMissing.join('\n  ')}`)
if (REPORT) link.report()
