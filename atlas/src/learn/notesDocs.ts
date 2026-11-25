import { create } from 'zustand'
import { getAll, persistStorage, putAll, removeAll } from '../lib/idb'
import { API_BASE, clientId, NotesError } from './notesExam'
import { photoFromFile, toBase64 } from '../lib/image'
import type { DocSection, FileKind, Slide } from './extract'

/**
 * Notes to Exam, before any questions: the student's material. Files are read on the device (PDF text, PowerPoint
 * slides and speaker notes, Word sections); page images that have no text (photos, scans, handwriting, picture-only
 * slides) are sent to be transcribed, a few at a time. Every part can be checked and edited. Then the parts are
 * grouped into topics, and the student chooses which to be examined on.
 *
 * Kept on this device (IndexedDB), so a lecture read once is there next time, offline too. Page images are held in
 * memory only until they are read, and never stored.
 */

export type DocKind = Exclude<FileKind, 'old-office' | 'other'> | 'camera'

/** One page, slide or section. */
export interface Part {
  id: string
  /** Where it is in its file: "slide 12", "page 3", "section 2". */
  ref: string
  title: string
  text: string
  /** Speaker notes (PowerPoint). */
  notes: string
  /** How the text was got: from the file itself, read from an image, or typed. */
  origin: 'file' | 'read' | 'typed'
  state: 'ready' | 'waiting' | 'reading' | 'failed' | 'illegible'
  /** For text read from an image: "partly" when some words could not be read. */
  legibility?: 'clear' | 'partly'
  edited?: boolean
}

export interface NoteDoc {
  id: string
  name: string
  kind: DocKind
  addedAt: string
  /** Reading the file itself (before any page images are transcribed). */
  stage: 'opening' | 'done' | 'error'
  /** While opening: pages or slides done, of how many. */
  progress?: { done: number; total: number }
  error?: string
  parts: Part[]
  /** Pictures in a Word file, which are not read. */
  skippedPictures: number
}

export interface Topic {
  id: string
  title: string
  summary: string
  /** Part ids, in order. */
  parts: string[]
  chosen: boolean
}

/** The title the topic split gives parts with nothing to examine (title slides, references). */
export const NOT_FOR_QUESTIONS = 'Not for questions'

/** Short display name: "Lecture 3.pptx" → "Lecture 3". */
export const shortName = (name: string) => name.replace(/\.(pptx|docx|pdf|txt|md|jpe?g|png|heic|heif|webp)$/i, '')

/** The full reference a question cites: "Lecture 3, slide 12". */
export const fullRef = (doc: Pick<NoteDoc, 'name' | 'kind'>, part: Pick<Part, 'ref'>) => (doc.kind === 'text' ? part.ref : `${shortName(doc.name)}, ${part.ref}`)

/** Everything in a part, as one text: title, body and speaker notes. */
export function partText(p: Pick<Part, 'title' | 'text' | 'notes'>): string {
  return [p.title, p.text, p.notes ? `Speaker notes: ${p.notes}` : ''].filter((x) => x.trim()).join('\n')
}

/** Shorter than this, a page or slide counts as having no text of its own (a scan, or a slide that is a picture). */
export const MIN_TEXT = 25

const uid = () => crypto.randomUUID().slice(0, 8)

/* ── From what the readers found to parts (pure; tested) ─────────────────────────────────────────────────── */

export function partsFromSlides(docId: string, slides: Slide[]): { parts: Part[]; toRead: { partId: string; picture: Slide['pictures'][number] }[] } {
  const toRead: { partId: string; picture: Slide['pictures'][number] }[] = []
  const parts = slides.map((s): Part => {
    const id = `${docId}:${s.n}`
    const bare = (s.title + s.text).replace(/\s/g, '').length < MIN_TEXT
    const needsReading = bare && s.pictures.length > 0
    if (needsReading) toRead.push({ partId: id, picture: s.pictures[0] })
    return { id, ref: `slide ${s.n}`, title: s.title, text: s.text, notes: s.notes, origin: needsReading ? 'read' : 'file', state: needsReading ? 'waiting' : 'ready' }
  })
  return { parts, toRead }
}

export function partsFromSections(docId: string, sections: DocSection[]): Part[] {
  return sections.map((s, k) => ({
    id: `${docId}:${k + 1}`,
    ref: s.heading ? `section ${k + 1} (${s.heading.length > 40 ? `${s.heading.slice(0, 39)}…` : s.heading})` : `section ${k + 1}`,
    title: s.heading,
    text: s.text,
    notes: '',
    origin: 'file',
    state: 'ready',
  }))
}

/** "slides 3–9", "pages 1, 4 and 6", "slide 12": the parts of a topic, compactly. */
export function refsText(parts: Pick<Part, 'ref'>[]): string {
  if (!parts.length) return ''
  const m = parts.map((p) => /^(slide|page|section|photo) (\d+)/.exec(p.ref))
  const kind = m[0]?.[1]
  if (!kind || m.some((x) => !x || x[1] !== kind)) return parts.length === 1 ? parts[0].ref : `${parts.length} parts`
  const nums = m.map((x) => Number(x![2]))
  if (nums.length === 1) return `${kind} ${nums[0]}`
  const runs: string[] = []
  for (let i = 0; i < nums.length; ) {
    let j = i
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++
    runs.push(j - i >= 2 ? `${nums[i]}–${nums[j]}` : j > i ? `${nums[i]}, ${nums[j]}` : `${nums[i]}`)
    i = j + 1
  }
  const list = runs.join(', ').split(', ')
  return `${kind}s ${list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0]}`
}

/** The notes sent for questions: every chosen part, under its full reference, so questions can cite where they come from. */
export function notesForQuestions(docs: NoteDoc[], topics: Topic[]): string {
  const chosen = new Set(topics.filter((t) => t.chosen).flatMap((t) => t.parts))
  const out: string[] = []
  for (const d of docs)
    for (const p of d.parts) {
      const text = partText(p).trim()
      if (chosen.has(p.id) && text) out.push(`[From: ${fullRef(d, p)}]\n${text}`)
    }
  return out.join('\n\n')
}

/** The chosen parts, each with its full reference, part id, topic and text: what is sent for questions. */
export function chosenParts(docs: NoteDoc[], topics: Topic[]): { ref: string; partId: string; topic: string; text: string }[] {
  const topicOf = new Map(topics.filter((t) => t.chosen).flatMap((t) => t.parts.map((id) => [id, t.title] as const)))
  const out: { ref: string; partId: string; topic: string; text: string }[] = []
  for (const d of docs)
    for (const p of d.parts) {
      const text = partText(p).trim()
      const topic = topicOf.get(p.id)
      if (topic && text) out.push({ ref: fullRef(d, p), partId: p.id, topic, text })
    }
  return out
}

/** Topics as the server returns them (by full reference) → topics of part ids. */
export function topicsFromServer(docs: NoteDoc[], raw: { title: string; summary: string; refs: string[] }[]): Topic[] {
  const byRef = new Map(docs.flatMap((d) => d.parts.map((p) => [fullRef(d, p), p.id] as const)))
  return raw
    .map((t) => ({ id: uid(), title: t.title, summary: t.summary, parts: t.refs.map((r) => byRef.get(r)).filter((x): x is string => !!x), chosen: t.title !== NOT_FOR_QUESTIONS }))
    .filter((t) => t.parts.length)
}

/** Without the topic service: one topic per file. */
export function topicsByFile(docs: NoteDoc[]): Topic[] {
  return docs
    .filter((d) => d.parts.some((p) => partText(p).trim()))
    .map((d) => ({ id: uid(), title: shortName(d.name), summary: `All of ${d.name}.`, parts: d.parts.filter((p) => partText(p).trim()).map((p) => p.id), chosen: true }))
}

/* ── The store ───────────────────────────────────────────────────────────────────────────────────────────── */

interface Draft {
  id: 'current'
  docs: NoteDoc[]
  topics: Topic[] | null
}

/** Page images waiting to be read: part id → JPEG. Memory only. */
const images = new Map<string, string>()

export const useNoteDocs = create<{
  docs: NoteDoc[]
  topics: Topic[] | null
  /** Finding topics: running, or the last error. */
  topicsState: 'idle' | 'working' | { error: string }
  /** Why the last pages could not be read (cleared on retry). */
  readError: string
  ready: boolean
  load: () => Promise<void>
  addFiles: (files: File[]) => Promise<string[]>
  addPhotos: (photos: { data: string }[]) => void
  addTyped: (text: string) => void
  removeDoc: (id: string) => void
  editPart: (docId: string, partId: string, text: string) => void
  retry: (docId?: string) => void
  findTopics: () => Promise<void>
  useFiles: () => void
  toggleTopic: (id: string) => void
  clearTopics: () => void
  clear: () => Promise<void>
}>((set, get) => {
  // Saved at most every 400 ms: typing a correction, or 100 slides arriving, is one write, not hundreds.
  let timer: ReturnType<typeof setTimeout> | null = null
  const save = () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      const { docs, topics } = get()
      persistStorage()
      void putAll<Draft>('noteDrafts', [{ id: 'current', docs, topics }]).catch(() => {})
    }, 400)
  }
  const update = (docId: string, f: (d: NoteDoc) => NoteDoc, persist = true) => {
    set((s) => ({ docs: s.docs.map((d) => (d.id === docId ? f(d) : d)) }))
    if (persist) save()
  }
  const setPart = (docId: string, partId: string, p: Partial<Part>) => update(docId, (d) => ({ ...d, parts: d.parts.map((x) => (x.id === partId ? { ...x, ...p } : x)) }))
  // Material changed: any topics found are out of date.
  const stale = () => set({ topics: null, topicsState: 'idle' })

  const newDoc = (name: string, kind: DocKind): NoteDoc => ({ id: uid(), name, kind, addedAt: new Date().toISOString(), stage: 'opening', parts: [], skippedPictures: 0 })

  async function open(doc: NoteDoc, file: File) {
    const progress = (done: number, total: number) => update(doc.id, (d) => ({ ...d, progress: { done, total } }), false)
    try {
      if (doc.kind === 'pptx' || doc.kind === 'docx') {
        const { readPptx, readDocx, mediaTypeOf } = await import('./extract')
        const bytes = new Uint8Array(await file.arrayBuffer())
        const xml = new DOMParser()
        if (doc.kind === 'pptx') {
          const { parts, toRead } = partsFromSlides(doc.id, readPptx(bytes, xml))
          update(doc.id, (d) => ({ ...d, parts }))
          for (const r of toRead) {
            try {
              images.set(r.partId, await jpeg(new Blob([r.picture.bytes as BlobPart], { type: mediaTypeOf(r.picture.path) })))
            } catch {
              setPart(doc.id, r.partId, { state: 'failed' })
            }
          }
        } else {
          const sections = readDocx(bytes, xml)
          update(doc.id, (d) => ({ ...d, parts: partsFromSections(doc.id, sections), skippedPictures: sections.reduce((n, s) => n + s.pictures, 0) }))
        }
      } else if (doc.kind === 'pdf') {
        await readPdf(doc.id, file, progress, (parts) => {
          update(doc.id, (d) => ({ ...d, parts }), false)
          pump()
        })
      } else if (doc.kind === 'image') {
        const id = `${doc.id}:1`
        images.set(id, await jpeg(file))
        update(doc.id, (d) => ({ ...d, parts: [{ id, ref: 'photo 1', title: '', text: '', notes: '', origin: 'read', state: 'waiting' }] }))
      } else if (doc.kind === 'text') {
        const text = (await file.text()).trim()
        update(doc.id, (d) => ({ ...d, parts: [{ id: `${doc.id}:1`, ref: d.name, title: '', text, notes: '', origin: 'file', state: 'ready' }] }))
      }
      update(doc.id, (d) => ({ ...d, stage: 'done', progress: undefined }))
      if (!get().docs.find((d) => d.id === doc.id)?.parts.length) update(doc.id, (d) => ({ ...d, stage: 'error', error: 'There is no text in this file.' }))
    } catch (e) {
      console.warn(e)
      update(doc.id, (d) => ({ ...d, stage: 'error', progress: undefined, error: openError(doc.kind) }))
    }
    pump()
  }

  /* Reading page images: up to 6 a request, 3 requests at a time, in the order they were added. */
  let running = 0
  const BATCH = 6
  const PARALLEL = 3
  function pump() {
    while (running < PARALLEL) {
      const batch: { docId: string; part: Part; data: string }[] = []
      for (const d of get().docs) for (const p of d.parts) if (p.state === 'waiting' && images.has(p.id) && batch.length < BATCH) batch.push({ docId: d.id, part: p, data: images.get(p.id)! })
      if (!batch.length) return
      running++
      for (const b of batch) setPart(b.docId, b.part.id, { state: 'reading' })
      void readBatch(batch).finally(() => {
        running--
        pump()
      })
    }
  }
  async function readBatch(batch: { docId: string; part: Part; data: string }[]) {
    try {
      const pages = await post<{ pages: { ref: string; text: string; legibility: 'clear' | 'partly' | 'illegible' }[] }>('/api/notes/read', {
        pages: batch.map((b) => ({ ref: b.part.id, mediaType: 'image/jpeg', data: b.data })),
      })
      for (const b of batch) {
        const r = pages.pages.find((x) => x.ref === b.part.id)
        images.delete(b.part.id)
        if (!r || r.legibility === 'illegible') setPart(b.docId, b.part.id, { state: 'illegible', text: '' })
        else setPart(b.docId, b.part.id, { state: 'ready', text: r.text, legibility: r.legibility })
      }
    } catch (e) {
      for (const b of batch) setPart(b.docId, b.part.id, { state: 'failed' })
      set({ readError: e instanceof NotesError ? e.message : 'The pages could not be read just now.' })
    }
  }

  async function loadDraft() {
    const [draft] = await getAll<Draft>('noteDrafts').catch(() => [] as Draft[])
    // Images are never stored: a page still waiting when Atlas closed has to be added again.
    const docs = (draft?.docs ?? []).map((d) => ({
      ...d,
      stage: d.stage === 'opening' ? ('error' as const) : d.stage,
      error: d.stage === 'opening' ? 'Atlas closed before this file was read. Add it again.' : d.error,
      progress: undefined,
      parts: d.parts.map((p) => (p.state === 'waiting' || p.state === 'reading' ? { ...p, state: 'failed' as const } : p)),
    }))
    // Files added while this was loading are kept, after the saved ones.
    set((s) => {
      const added = s.docs.filter((d) => !docs.some((x) => x.id === d.id))
      return { docs: [...docs, ...added], topics: added.length ? null : (draft?.topics ?? null), ready: true }
    })
    if (get().docs.length !== docs.length) save()
  }
  let loading: Promise<void> | null = null

  return {
    docs: [],
    topics: null,
    topicsState: 'idle',
    readError: '',
    ready: false,
    load: () => (loading ??= loadDraft()),
    addFiles: async (files) => {
      const { kindOf } = await import('./extract')
      const problems: string[] = []
      for (const f of files) {
        const kind = kindOf(f.name, f.type)
        if (kind === 'old-office') problems.push(`“${f.name}” is an older Office file. Save it as .pptx or .docx and add it again.`)
        else if (kind === 'other') problems.push(`“${f.name}” is not a file Atlas can read. Add PDF, PowerPoint, Word, photo or text files.`)
        else if (f.size > FILE_LIMIT) problems.push(`“${f.name}” is larger than ${FILE_LIMIT / 1024 / 1024} MB.`)
        else {
          const doc = newDoc(f.name, kind)
          set((s) => ({ docs: [...s.docs, doc] }))
          stale()
          void open(doc, f)
        }
      }
      return problems
    },
    addPhotos: (photos) => {
      if (!photos.length) return
      // Camera pages join one "Photos" file per session of taking them.
      const doc = newDoc(`Photos, ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 'camera')
      const parts: Part[] = photos.map((ph, k) => {
        const id = `${doc.id}:${k + 1}`
        images.set(id, ph.data)
        return { id, ref: `photo ${k + 1}`, title: '', text: '', notes: '', origin: 'read', state: 'waiting' }
      })
      set((s) => ({ docs: [...s.docs, { ...doc, stage: 'done', parts }] }))
      stale()
      save()
      pump()
    },
    addTyped: (text) => {
      if (!text.trim()) return
      const doc = newDoc('Typed notes', 'text')
      set((s) => ({ docs: [...s.docs, { ...doc, stage: 'done', parts: [{ id: `${doc.id}:1`, ref: 'typed notes', title: '', text: text.trim(), notes: '', origin: 'typed', state: 'ready' }] }] }))
      stale()
      save()
    },
    removeDoc: (id) => {
      for (const p of get().docs.find((d) => d.id === id)?.parts ?? []) images.delete(p.id)
      set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }))
      stale()
      save()
    },
    editPart: (docId, partId, text) => {
      setPart(docId, partId, { text, edited: true, state: 'ready' })
      // Edits to the text do not change which parts are in which topic.
    },
    retry: (docId) => {
      set({ readError: '' })
      for (const d of get().docs) if (!docId || d.id === docId) for (const p of d.parts) if (p.state === 'failed' && images.has(p.id)) setPart(d.id, p.id, { state: 'waiting' })
      pump()
    },
    findTopics: async () => {
      const docs = get().docs
      const units = docs.flatMap((d) => d.parts.filter((p) => partText(p).trim()).map((p) => ({ ref: fullRef(d, p), text: partText(p) })))
      if (!units.length) return
      set({ topicsState: 'working' })
      try {
        const r = await post<{ topics: { title: string; summary: string; refs: string[] }[] }>('/api/notes/topics', { units })
        const topics = topicsFromServer(docs, r.topics)
        set({ topics: topics.length ? topics : topicsByFile(docs), topicsState: 'idle' })
        save()
      } catch (e) {
        set({ topicsState: { error: e instanceof NotesError ? e.message : 'The topics could not be found just now.' } })
      }
    },
    useFiles: () => {
      set({ topics: topicsByFile(get().docs), topicsState: 'idle' })
      save()
    },
    toggleTopic: (id) => {
      set((s) => ({ topics: s.topics?.map((t) => (t.id === id ? { ...t, chosen: !t.chosen } : t)) ?? null }))
      save()
    },
    clearTopics: () => {
      stale()
      save()
    },
    clear: async () => {
      images.clear()
      set({ docs: [], topics: null, topicsState: 'idle' })
      await removeAll('noteDrafts', ['current']).catch(() => {})
    },
  }
})

/** Largest file accepted (PDFs of a whole module can be large). */
export const FILE_LIMIT = 100 * 1024 * 1024

function openError(kind: DocKind): string {
  if (kind === 'pptx') return 'This PowerPoint file could not be opened. Check it opens on your computer, then add it again.'
  if (kind === 'docx') return 'This Word file could not be opened. Check it opens on your computer, then add it again.'
  if (kind === 'pdf') return 'This PDF could not be opened. It may be protected by a password.'
  if (kind === 'image') return 'This photo could not be opened.'
  return 'This file could not be opened.'
}

/** Reading is done when no part is waiting or being read and no file is still opening. */
export function readingState(docs: NoteDoc[]) {
  const parts = docs.flatMap((d) => d.parts)
  const toRead = parts.filter((p) => p.origin === 'read')
  return {
    opening: docs.some((d) => d.stage === 'opening'),
    waiting: parts.filter((p) => p.state === 'waiting' || p.state === 'reading').length,
    read: toRead.filter((p) => p.state === 'ready').length,
    toRead: toRead.length,
    failed: parts.filter((p) => p.state === 'failed').length,
    illegible: parts.filter((p) => p.state === 'illegible').length,
    partly: parts.filter((p) => p.legibility === 'partly' && !p.edited).length,
    withText: parts.filter((p) => partText(p).trim()).length,
  }
}

/* ── Browser-only helpers ────────────────────────────────────────────────────────────────────────────────── */

async function jpeg(blob: Blob): Promise<string> {
  const p = await photoFromFile(blob)
  URL.revokeObjectURL(p.url)
  return p.data
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (API_BASE === null) throw new NotesError('Reading pages needs the Atlas question service, which is not set up on this copy of Atlas.')
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atlas-Client': clientId() }, body: JSON.stringify(body) })
  } catch {
    throw new NotesError('Atlas could not reach the question service. Check your connection and try again.')
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !data) throw new NotesError(data?.error ?? 'The question service is not available just now. Please try again.')
  return data
}

/**
 * A PDF, page by page: the text layer where there is one; pages without one (scans, photos) are drawn and queued
 * to be read. Pages are handed over as they are done, so a long file shows progress.
 */
async function readPdf(docId: string, file: File, progress: (done: number, total: number) => void, publish: (parts: Part[]) => void) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise
  const parts: Part[] = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const content = await page.getTextContent()
      let text = ''
      for (const item of content.items) if ('str' in item) text += item.str + (item.hasEOL ? '\n' : '')
      text = text
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      const id = `${docId}:${n}`
      if (text.replace(/\s/g, '').length >= MIN_TEXT) parts.push({ id, ref: `page ${n}`, title: '', text, notes: '', origin: 'file', state: 'ready' })
      else {
        const vp = page.getViewport({ scale: 1 })
        const scale = Math.min(3, 2000 / Math.max(vp.width, vp.height))
        const view = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(view.width)
        canvas.height = Math.round(view.height)
        await page.render({ canvas, viewport: view }).promise
        const blob = await new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.86))
        images.set(id, await toBase64(blob))
        parts.push({ id, ref: `page ${n}`, title: '', text, notes: '', origin: 'read', state: 'waiting' })
      }
      page.cleanup()
      progress(n, pdf.numPages)
      if (n % 10 === 0 || n === pdf.numPages) publish([...parts])
    }
  } finally {
    void task.destroy()
  }
}
