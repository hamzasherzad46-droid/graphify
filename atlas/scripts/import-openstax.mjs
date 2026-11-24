// Imports chapters 6–9 (skeletal system), 12–16 (nervous system) and 20 (blood vessels and circulation) of OpenStax
// Anatomy and Physiology 2e into content/textbook/ as
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
  // Sources for the layered flashcards' nerve and vessel statements (read in the Textbook; no exam questions by region).
  { num: 12, title: 'The Nervous System and Nervous Tissue', modules: [['m46504', 'nervous'], ['m46500', 'nervous'], ['m46509', 'nervous'], ['m46531', 'nervous'], ['m46526', 'nervous'], ['m46503', 'nervous']] },
  { num: 13, title: 'Anatomy of the Nervous System', modules: [['m46528', 'nervous'], ['m46535', 'nervous'], ['m46533', 'nervous'], ['m46719', 'nervous'], ['m46553', 'nervous']] },
  { num: 14, title: 'The Somatic Nervous System', modules: [['m46561', 'nervous'], ['m46577', 'nervous'], ['m46557', 'nervous'], ['m46574', 'nervous']] },
  { num: 15, title: 'The Autonomic Nervous System', modules: [['m46590', 'nervous'], ['m46582', 'nervous'], ['m46579', 'nervous'], ['m46581', 'nervous'], ['m46587', 'nervous']] },
  { num: 16, title: 'The Neurological Exam', modules: [['m46593', 'nervous'], ['m46594', 'nervous'], ['m46650', 'nervous'], ['m46607', 'nervous'], ['m46640', 'nervous'], ['m46604', 'nervous']] },
  { num: 20, title: 'The Cardiovascular System: Blood Vessels and Circulation', modules: [['m46600', 'vessels'], ['m46597', 'vessels'], ['m46635', 'vessels'], ['m46586', 'vessels'], ['m46603', 'vessels'], ['m46646', 'vessels'], ['m46610', 'vessels']] },
]

/** What Atlas changed, listed at the end of every section (CC BY 4.0 asks for changes to be indicated). */
const CHANGES = [
  'Sections are grouped by Atlas topic.',
  'The chapter review summary of each section is shown at its top as key points: the first sentence of each summary paragraph, with the rest of the paragraph one tap away.',
  'Spelling follows British English (for example haemorrhage, fibre, colour), with one form for each word across Atlas (for example brainstem, anteroposterior).',
  'Typing errors in the source are corrected; each correction is listed in Atlas’s spelling dictionary.',
  'Links to videos, interactive exercises and external websites are removed.',
  'Three review questions per section are shown as a quick check; the other review and critical thinking questions are used among the exam-style questions.',
  'Bone names and bone landmarks link to the Atlas 3D model.',
  'Figures are resized and re-encoded for the web; their content is unchanged.',
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

function inline(node, ctx) {
  const out = []
  const push = (x) => {
    if (typeof x === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += x
    else out.push(x)
  }
  for (const c of node.childNodes ?? []) {
    if (c.nodeType === 3) push(clean(c.data))
    else if (c.nodeType !== 1) continue
    else if (c.localName === 'term') push({ k: 'term', t: textOf(c) })
    else if (c.localName === 'emphasis') {
      // Spaces at the edge of an emphasis ("<emphasis>not </emphasis>activate") belong to the text around it.
      const raw = clean(c.textContent ?? '')
      if (/^\s/.test(raw)) push(' ')
      push({ k: c.getAttribute('effect') === 'bold' ? 'strong' : 'em', t: raw.trim() })
      if (/\s$/.test(raw)) push(' ')
    }
    else if (c.localName === 'sup' || c.localName === 'sub') push({ k: c.localName, t: textOf(c) })
    else if (c.localName === 'link') {
      const t = textOf(c)
      const target = c.getAttribute('target-id')
      if (c.getAttribute('url')) push(t) // external link: keep the words, drop the link
      else if (target && ctx.labels.has(target)) push({ k: 'ref', t: t || ctx.labels.get(target), to: target })
      else if (c.getAttribute('document')) push(t || ctx.docTitle(c.getAttribute('document')))
      else push(t)
    } else if (c.localName === 'newline') push(' ')
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

/** The chapter review summary as key points: each paragraph's first sentence, with the rest of it kept for "more". */
function keyPoints(doc) {
  const sec = [...doc.getElementsByTagName('section')].find((s) => s.getAttribute('class') === 'summary')
  if (!sec) return []
  return children(sec, 'para').map((p) => {
    const [lead, ...rest] = textOf(p).split(/(?<=[.!?])\s+(?=[A-Z(])/)
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
    link.setMode({ nerves: topic === 'nervous' })
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
    await sharp(img).resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out)
  }
  bytes += readFileSync(out).length
  have.delete(name)
}
for (const stale of have) rmSync(join(MEDIA, stale))
console.log(`${index.length} sections, ${allImages.size} figures (${(bytes / 1e6).toFixed(1)} MB); ${spellingSummary()}`)
if (REPORT) link.report()
