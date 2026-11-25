import { unzipSync, strFromU8 } from 'fflate'

/**
 * Reading the student's files on the device: PowerPoint (slides and speaker notes) and Word. Text never leaves the
 * device at this stage; only page images that need reading (scans, photos, picture-only slides) are sent to be
 * transcribed. PDFs are read by pdf.js (notesDocs.ts).
 *
 * The parsers take the XML parser as an argument, so they run in the browser (DOMParser) and in tests (xmldom).
 */

export interface XmlParser {
  parseFromString(xml: string, type: 'application/xml' | 'text/xml'): Document
}

export interface Slide {
  /** 1-based, in presentation order. */
  n: number
  title: string
  /** The slide's text (title excluded): one line per paragraph, "- " for bullets, indented by level. */
  text: string
  /** Speaker notes, as written. */
  notes: string
  /** Pictures on the slide, largest first: paths inside the file, with their bytes for reading. */
  pictures: { path: string; bytes: Uint8Array }[]
}

export interface DocSection {
  heading: string
  text: string
  pictures: number
}

const MEDIA: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff' }
export const mediaTypeOf = (path: string) => MEDIA[path.split('.').pop()!.toLowerCase()] ?? ''

/** Elements by qualified name ("a:t"), in document order. */
const all = (n: Document | Element, name: string) => Array.from(n.getElementsByTagName(name))
const kids = (n: Element, name: string) => Array.from(n.childNodes).filter((c): c is Element => c.nodeType === 1 && (c as Element).nodeName === name)
const first = (n: Element, name: string): Element | undefined => all(n, name)[0]

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes)
  } catch {
    throw new Error('not a zip')
  }
}

/** Resolve a relationship target against the part that refers to it ("ppt/slides/slide1.xml" + "../media/a.png"). */
function resolve(from: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const parts = from.split('/').slice(0, -1)
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

function rels(files: Record<string, Uint8Array>, part: string, xml: XmlParser): { id: string; type: string; target: string }[] {
  const path = part.replace(/([^/]+)$/, '_rels/$1.rels')
  if (!files[path]) return []
  const doc = xml.parseFromString(strFromU8(files[path]), 'application/xml')
  return all(doc, 'Relationship').map((r) => ({
    id: r.getAttribute('Id') ?? '',
    type: r.getAttribute('Type') ?? '',
    target: r.getAttribute('TargetMode') === 'External' ? '' : resolve(part, r.getAttribute('Target') ?? ''),
  }))
}

/** A DrawingML paragraph's text: runs, fields and line breaks. */
function drawingParagraph(p: Element): string {
  let s = ''
  for (const c of Array.from(p.childNodes)) {
    if (c.nodeType !== 1) continue
    const e = c as Element
    if (e.nodeName === 'a:r' || e.nodeName === 'a:fld') s += first(e, 'a:t')?.textContent ?? ''
    else if (e.nodeName === 'a:br') s += '\n'
  }
  return s.replace(/[ \t\u00a0]+/g, ' ').trim()
}

/** The paragraphs of a text body, with bullets and indent levels. */
function textBody(body: Element, bullets: boolean): string[] {
  const out: string[] = []
  for (const p of kids(body, 'a:p')) {
    const t = drawingParagraph(p)
    if (!t) continue
    const pPr = first(p, 'a:pPr')
    const lvl = Number(pPr?.getAttribute('lvl') ?? 0)
    // Bulleted: by the placeholder's default unless turned off, or by an explicit bullet.
    const bullet = pPr && (first(pPr, 'a:buChar') || first(pPr, 'a:buAutoNum')) ? true : pPr && first(pPr, 'a:buNone') ? false : bullets
    out.push(bullet ? `${'  '.repeat(lvl)}- ${t}` : t)
  }
  return out
}

const placeholder = (sp: Element) => first(sp, 'p:ph')?.getAttribute('type') ?? (first(sp, 'p:ph') ? 'body' : '')

/** A PowerPoint file (.pptx): every slide's title, text and speaker notes, in order. */
export function readPptx(bytes: Uint8Array, xml: XmlParser): Slide[] {
  const files = unzip(bytes)
  const pres = files['ppt/presentation.xml']
  if (!pres) throw new Error('not a presentation')
  const presRels = new Map(rels(files, 'ppt/presentation.xml', xml).map((r) => [r.id, r.target]))
  const order = all(xml.parseFromString(strFromU8(pres), 'application/xml'), 'p:sldId')
    .map((s) => presRels.get(s.getAttribute('r:id') ?? ''))
    .filter((p): p is string => !!p && !!files[p])

  return order.map((part, k) => {
    const doc = xml.parseFromString(strFromU8(files[part]), 'application/xml')
    let title = ''
    const lines: string[] = []
    for (const sp of all(doc, 'p:sp')) {
      const type = placeholder(sp)
      if (type === 'sldNum' || type === 'dt' || type === 'ftr') continue
      const body = first(sp, 'p:txBody')
      if (!body) continue
      if ((type === 'title' || type === 'ctrTitle') && !title) title = textBody(body, false).join(' ')
      else lines.push(...textBody(body, type === 'body' || type === 'obj'))
    }
    // Tables: one line per row, cells separated by " | ".
    for (const tr of all(doc, 'a:tr')) {
      const cells = kids(tr, 'a:tc').map((tc) => all(tc, 'a:p').map(drawingParagraph).filter(Boolean).join(' '))
      if (cells.some(Boolean)) lines.push(cells.join(' | '))
    }
    const slideRels = rels(files, part, xml)
    const byId = new Map(slideRels.map((r) => [r.id, r.target]))
    const pictures = all(doc, 'p:pic')
      .map((pic) => byId.get(first(pic, 'a:blip')?.getAttribute('r:embed') ?? ''))
      .filter((p): p is string => !!p && !!files[p] && !!mediaTypeOf(p))
      .filter((p, i, a) => a.indexOf(p) === i)
      .map((path) => ({ path, bytes: files[path] }))
      .sort((a, b) => b.bytes.length - a.bytes.length)
    // Speaker notes: the body placeholder of the notes page (not the slide image or the slide number).
    let notes = ''
    const notesPart = slideRels.find((r) => r.type.endsWith('/notesSlide'))?.target
    if (notesPart && files[notesPart]) {
      const nd = xml.parseFromString(strFromU8(files[notesPart]), 'application/xml')
      notes = all(nd, 'p:sp')
        .filter((sp) => placeholder(sp) === 'body')
        .flatMap((sp) => textBody(first(sp, 'p:txBody')!, false))
        .join('\n')
    }
    return { n: k + 1, title, text: lines.join('\n'), notes, pictures }
  })
}

/** A Word paragraph's text: runs, tabs and breaks. */
function wordParagraph(p: Element): string {
  let s = ''
  for (const r of all(p, 'w:r')) {
    for (const c of Array.from(r.childNodes)) {
      if (c.nodeType !== 1) continue
      const n = (c as Element).nodeName
      if (n === 'w:t') s += c.textContent ?? ''
      else if (n === 'w:tab') s += ' '
      else if (n === 'w:br' || n === 'w:cr') s += '\n'
    }
  }
  return s.replace(/[ \u00a0]+/g, ' ').trim()
}

const HEADING = /^(Title|Heading[1-3]|heading [1-3]|Subtitle)$/

/** Longest section sent as one part; longer ones are split at paragraph boundaries. */
export const SECTION_CHARS = 2500

/** A Word file (.docx): the text in sections, split at headings (and at length). */
export function readDocx(bytes: Uint8Array, xml: XmlParser): DocSection[] {
  const files = unzip(bytes)
  const main = files['word/document.xml']
  if (!main) throw new Error('not a Word document')
  const doc = xml.parseFromString(strFromU8(main), 'application/xml')
  const body = first(doc.documentElement, 'w:body')
  if (!body) return []
  const sections: DocSection[] = []
  let cur: DocSection = { heading: '', text: '', pictures: 0 }
  const push = () => {
    if (cur.text.trim() || cur.heading) sections.push({ ...cur, text: cur.text.trim() })
  }
  const add = (line: string) => {
    if (cur.text.length + line.length > SECTION_CHARS && cur.text) {
      push()
      cur = { heading: cur.heading, text: '', pictures: 0 }
    }
    cur.text += `${line}\n`
  }
  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType !== 1) continue
    const e = node as Element
    if (e.nodeName === 'w:p') {
      cur.pictures += all(e, 'w:drawing').length + all(e, 'w:pict').length
      const t = wordParagraph(e)
      if (!t) continue
      const style = first(e, 'w:pStyle')?.getAttribute('w:val') ?? ''
      if (HEADING.test(style)) {
        push()
        cur = { heading: t, text: '', pictures: 0 }
      } else add(first(e, 'w:numPr') || /^List/.test(style) ? `- ${t}` : t)
    } else if (e.nodeName === 'w:tbl') {
      for (const tr of all(e, 'w:tr')) {
        const cells = all(tr, 'w:tc').map((tc) => all(tc, 'w:p').map(wordParagraph).filter(Boolean).join(' '))
        if (cells.some(Boolean)) add(cells.join(' | '))
      }
    }
  }
  push()
  return sections
}

/** What kind of file this is, from its name and type. */
export type FileKind = 'pdf' | 'pptx' | 'docx' | 'image' | 'text' | 'old-office' | 'other'
export function kindOf(name: string, type: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf'
  if (ext === 'pptx') return 'pptx'
  if (ext === 'docx') return 'docx'
  if (ext === 'ppt' || ext === 'doc') return 'old-office'
  if (ext === 'txt' || ext === 'md' || type === 'text/plain') return 'text'
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif'].includes(ext)) return 'image'
  return 'other'
}
