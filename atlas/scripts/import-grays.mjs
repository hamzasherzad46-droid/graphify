// Imports the Osteology chapters of Gray's Anatomy of the Human Body (20th ed., 1918; public domain) as the
// textbook's "Classic reference": content/classic/<section>.json and public/classic/*.webp.
//
// Text and figures: the 1918 edition as transcribed for Bartleby.com (2000), read from the copy at
// www.theodora.com/anatomy/ (Bartleby closed in 2025). Only the text and Carter's figures are used, not the site's
// layout. Pages are fetched politely (one a second) and cached in .cache/grays.
//
//   node scripts/import-grays.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { linker } from './lib/bonelink.mjs'
import { normaliseDeep, summary as spellingSummary } from './lib/textnorm.mjs'

const BASE = 'https://www.theodora.com/anatomy/'
const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, '.cache', 'grays')
const OUT = join(ROOT, 'content', 'classic')
const MEDIA = join(ROOT, 'public', 'classic')

/** Atlas textbook section → Gray's pages, in reading order. */
const MAP = {
  's7-2': ['the_skull', 'the_occipital_bone', 'the_parietal_bone', 'the_frontal_bone', 'the_temporal_bone', 'the_sphenoid_bone', 'ethmoid_bone', 'the_nasal_bones', 'the_maxillae_upper_jaw', 'the_lacrimal_bone', 'the_zygomatic_bone', 'the_palatine_bone', 'the_inferior_nasal_concha', 'the_vomer', 'the_mandible_lower_jaw', 'the_hyoid_bone', 'the_exterior_of_the_skull', 'the_interior_of_the_skull'],
  's7-3': ['the_vertebral_column', 'general_characteristics_of_a_vertebra', 'the_cervical_vertebrae', 'the_thoracic_vertebrae', 'the_lumbar_vertebrae', 'the_sacral_and_coccygeal_vertebrae', 'the_vertebral_column_as_a_whole'],
  's7-4': ['the_thorax', 'the_sternum', 'the_ribs', 'the_costal_cartilages'],
  's8-1': ['the_clavicle', 'the_scapula_shoulder_blade'],
  's8-2': ['the_humerus', 'the_ulna', 'the_radius', 'the_carpus', 'the_metacarpus', 'the_phalanges_of_the_hand'],
  's8-3': ['the_hip_bone', 'the_pelvis'],
  's8-4': ['the_femur', 'the_patella', 'the_tibia', 'the_fibula', 'the_tarsus', 'the_metatarsus', 'the_phalanges_of_the_foot', 'comparison_of_the_bones_of_the_hand_and_foot', 'the_sesamoid_bones'],
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function cached(name, binary = false) {
  const file = join(CACHE, name.replace(/\//g, '__'))
  if (!existsSync(file)) {
    mkdirSync(CACHE, { recursive: true })
    await sleep(1000)
    const res = await fetch(BASE + name, { headers: { 'User-Agent': 'AtlasTextbookImport/1.0' } })
    if (!res.ok) throw new Error(`${res.status} ${name}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return binary ? readFileSync(file) : readFileSync(file, 'latin1')
}

const CP1252 = { 128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘', 146: '’', 147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ' }
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n)
      // Windows-1252 characters written as numeric entities (128–159 are not Unicode code points for text).
      return CP1252[c] ?? String.fromCodePoint(c)
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

/** Inline content of a cell: bold and italic kept, footnote markers and other tags dropped. */
function inline(html) {
  const out = []
  const push = (x) => {
    if (typeof x === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += x
    else if (x !== '') out.push(x)
  }
  const s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<SUP>[\s\S]*?<\/SUP>/gi, '') // footnote markers
    .replace(/<A NAME="txt\d+">[\s\S]*?<\/A>/gi, '')
    .replace(/\s*\(\*\s*<A HREF="#note\d+">\d+<\/A>\)?/gi, '')
    .replace(/<A [^>]*>|<\/A>/gi, '')
    .replace(/<FONT[^>]*>|<\/FONT>/gi, '')
  // Walk <B>…</B> and <I>…</I> at the top level (italic inside bold is kept as part of the bold text).
  const re = /<(B|I)>([\s\S]*?)<\/\1>/gi
  let last = 0
  for (const m of s.matchAll(re)) {
    push(decode(s.slice(last, m.index).replace(/<[^>]+>/g, '')))
    const t = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ')
    if (t.trim()) push({ k: m[1].toUpperCase() === 'B' ? 'strong' : 'em', t })
    last = m.index + m[0].length
  }
  push(decode(s.slice(last).replace(/<[^>]+>/g, '')))
  // A run-in heading that has lost its full stop and dash ("by Age</B>At birth"): restore them, as elsewhere in Gray's.
  for (let i = 1; i < out.length; i++) {
    if (out[i - 1]?.k !== 'strong' || !/[a-z]$/.test(out[i - 1].t)) continue
    if (typeof out[i] === 'string' && /^[A-Z][a-z]/.test(out[i])) out[i] = `.—${out[i]}`
    else if (out[i]?.k === 'strong' && /^[A-Z][a-z]/.test(out[i].t)) out.splice(i, 0, '.—') // "by Age</B><B>At birth"
  }
  // A few stray "<" in the source HTML (e.g. "Cervicales).<The") are typos, not text.
  for (let i = 0; i < out.length; i++) if (typeof out[i] === 'string') out[i] = out[i].replace(/<(?=[A-Za-z])/g, '')
  const tidy = out.map((x) => (typeof x === 'string' ? x.replace(/\s+/g, ' ') : x))
  if (typeof tidy[0] === 'string') tidy[0] = tidy[0].replace(/^\s+/, '')
  if (typeof tidy[tidy.length - 1] === 'string') tidy[tidy.length - 1] = tidy[tidy.length - 1].replace(/\s+$/, '')
  return tidy.filter((x) => x !== '')
}

const plain = (inl) => inl.map((x) => (typeof x === 'string' ? x : x.t)).join('')

async function page(slug) {
  const html = await cached(`${slug}.html`)
  const title = decode((html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? slug).replace(/ - Human Anatomy\s*$/, '')).trim()
  // The text: from the first page marker to the footnotes.
  // The text starts with the page's main content table (figures and paragraphs), before any page marker.
  let start = html.search(/<TABLE ALIGN="CENTER" BORDER="0" WIDTH="455"/i)
  if (start < 0) start = html.search(/<!-- PAGE NUM/)
  let end = html.search(/<A NAME="note\d+">/i)
  if (end < 0) end = html.search(/<\/BODY>/i)
  const body = html.slice(start, end)
  const blocks = []
  const images = []
  let n = 0
  const cells = [...body.matchAll(/<TD>([\s\S]*?)(?=<\/TD>|<TR>|<\/TABLE>)/gi)].map((m) => m[1])
  for (let k = 0; k < cells.length; k++) {
    const c = cells[k]
    const img = c.match(/<img[^>]*src="(images\/[^"]+)"/i)
    if (img) {
      const cap = cells[k + 1] && /IG\./.test(cells[k + 1]) ? cells[++k] : ''
      const capText = decode(cap.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
      const fm = capText.match(/^F\s*IG\.\s*(\d+)\s*[–-]\s*(.*)$/)
      const name = img[1].replace(/^images\//, '').replace(/\.[a-z]+$/i, '') + '.webp'
      images.push([img[1], name])
      blocks.push({ t: 'fig', id: `g-${slug}-f${fm ? fm[1] : ++n}`, label: fm ? `Fig. ${fm[1]}` : 'Figure', title: '', src: `classic/${name}`, alt: fm ? fm[2] : capText, caption: fm ? [fm[2]] : capText ? [capText] : [] })
      continue
    }
    // Centred subtitles ("(Os Frontale)", "(Breast Bone)") open some cells: a small heading of their own.
    let rest = c
    for (let m = rest.match(/^\s*(?:&nbsp;)*\s*<DIV ALIGN="center">([\s\S]*?)<\/DIV>/i); m; m = rest.match(/^\s*<DIV ALIGN="center">([\s\S]*?)<\/DIV>/i)) {
      const t = plain(inline(m[1])).replace(/\s+/g, ' ').trim()
      if (t) blocks.push({ t: 'h', id: `g-${slug}-h${++n}`, level: 4, text: t })
      rest = rest.slice(m[0].length)
    }
    const inl = inline(rest)
    const text = plain(inl).trim()
    if (!text || /^F\s*IG\./.test(text)) continue
    blocks.push({ t: 'p', id: `g-${slug}-${++n}`, inl })
  }
  return { slug, title, blocks, images }
}

/**
 * Gray's 1918 follows its cranial indices with a table (after Duckworth) ranking human populations by skull shape. That
 * racial typology is discredited, and the table uses terms now recognised as offensive: it is replaced by a note. The
 * indices themselves, which are anatomy, are kept.
 */
function withoutRaceTable(blocks) {
  const text = (b) => (b.inl ? plain(b.inl) : '')
  const start = blocks.findIndex((b) => text(b).startsWith('The following table, modified from that given by Duckworth'))
  if (start < 0) return blocks
  const end = blocks.findIndex((b, k) => k > start && text(b).startsWith('The chief function of the skull'))
  if (end < 0) throw new Error('Gray’s: the end of the skull classification table was not found')
  const note = {
    t: 'p',
    id: blocks[start].id,
    inl: ['[Atlas: Gray’s 1918 text here gives a table ranking human populations by these skull indices. That racial typology has been discredited, and the table uses terms now recognised as offensive, so it is left out. The indices themselves are described above.]'],
  }
  return [...blocks.slice(0, start), note, ...blocks.slice(end)]
}

const link = linker(JSON.parse(readFileSync(join(ROOT, 'content', 'landmarks.json'), 'utf8')).landmarks)
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(MEDIA, { recursive: true })
const wanted = new Map()
let paras = 0
for (const [section, slugs] of Object.entries(MAP)) {
  const entries = []
  for (const slug of slugs) {
    const p = await page(slug)
    for (const [src, name] of p.images) wanted.set(name, src)
    paras += p.blocks.filter((b) => b.t === 'p').length
    entries.push(normaliseDeep({ slug: p.slug, title: p.title, blocks: link.blocks(withoutRaceTable(p.blocks)) }, 'grays'))
  }
  writeFileSync(
    join(OUT, `${section}.json`),
    JSON.stringify({
      section,
      source: {
        work: 'Anatomy of the Human Body',
        author: 'Henry Gray',
        edition: '20th edition, thoroughly revised and re-edited by Warren H. Lewis',
        publisher: 'Lea & Febiger, Philadelphia',
        year: 1918,
        license: 'Public domain',
        transcription: 'Bartleby.com (2000), read from www.theodora.com/anatomy',
        changes: 'Spelling follows modern British English: æ and œ are written ae and oe (vertebrae), American spellings are made British, transcription errors are corrected and lost hyphens restored (one-half). One table is left out (see the note in “The Interior of the Skull”).',
      },
      entries,
    }),
  )
}

// Figures: Carter's engravings, as WebP (max 900 px wide).
const missing = new Set()
const have = new Set(readdirSync(MEDIA))
for (const [name, src] of wanted) {
  if (!have.has(name)) {
    const convert = async () => sharp(await cached(src, true), { animated: false }).resize({ width: 900, withoutEnlargement: true }).flatten({ background: '#ffffff' }).webp({ quality: 82 }).toFile(join(MEDIA, name))
    try {
      await convert()
    } catch {
      // A truncated download: fetch it once more.
      rmSync(join(CACHE, src.replace(/\//g, '__')), { force: true })
      try {
        await convert()
      } catch (e) {
        console.warn(`skipped ${src}: ${e.message}`)
        missing.add(name)
        continue
      }
    }
  }
  have.delete(name)
}
for (const stale of have) rmSync(join(MEDIA, stale))
// A figure that could not be read is left out of the text rather than shown broken.
if (missing.size)
  for (const f of readdirSync(OUT)) {
    const j = JSON.parse(readFileSync(join(OUT, f), 'utf8'))
    for (const e of j.entries) e.blocks = e.blocks.filter((b) => !(b.t === 'fig' && missing.has(b.src.replace(/^classic\//, ''))))
    writeFileSync(join(OUT, f), JSON.stringify(j))
  }
const bytes = [...wanted.keys()].filter((f) => !missing.has(f)).reduce((s, f) => s + readFileSync(join(MEDIA, f)).length, 0)
console.log(`${Object.keys(MAP).length} sections, ${Object.values(MAP).flat().length} pages, ${paras} paragraphs, ${wanted.size} figures (${(bytes / 1e6).toFixed(1)} MB); ${spellingSummary()}`)
