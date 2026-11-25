import { create } from 'zustand'
import { getAll, persistStorage, putAll, removeAll } from '../lib/idb'
import { isCorrect, type ExamAnswer, type Level, type Mark, type Question } from './questions'
import type { StoredCard } from '../state/progress'

/**
 * Notes to Exam: questions and flashcards written from the student's own material. The student chooses topics of
 * material Atlas has read (notesDocs.ts); the server sends those parts to Claude, which drafts questions topic by
 * topic, and a second, independent pass checks every one before the student sees it. Batches arrive as they are
 * ready, so the first questions appear while the rest are written.
 *
 * Every question cites where it comes from ("From your notes: Lecture 3, slide 12"). Answered questions join spaced
 * review (FSRS, under `nq:<question id>`), and flashcards go to My cards. A set is kept on this device only.
 */

export type Mode = 'quick' | 'mock' | 'flashcards' | 'weak'
export type QType = 'sba' | 'short' | 'tf' | 'cloze'
export interface NotesSettings {
  mode: Mode
  count: number
  level: Level
  types: QType[]
}

export const MODE_INFO: Record<Mode, { label: string; blurb: string; counts: number[]; types: boolean }> = {
  quick: { label: 'Quick quiz', blurb: 'A few questions on the key facts, ready in moments.', counts: [5, 10], types: true },
  mock: { label: 'Mock exam', blurb: 'A full, timed exam across your topics. Answers at the end.', counts: [20, 30, 40], types: true },
  flashcards: { label: 'Flashcards', blurb: 'Cards for spaced review, added to My cards.', counts: [10, 20, 30], types: false },
  weak: { label: 'Weak spots', blurb: 'New questions on the points you got wrong before.', counts: [5, 10], types: true },
}
export const TYPE_INFO: Record<QType, string> = { sba: 'Single best answer', tf: 'True or false', cloze: 'Fill in the blank', short: 'Short answer' }

export interface Correction {
  quote: string
  ref?: string
  problem: string
  correction: string
}
export interface Conflict {
  quoteA: string
  refA: string
  quoteB: string
  refB: string
  note: string
}

/** A question as the server returns it. */
export interface ServerQuestion {
  type: QType
  frequency: Question['frequency']
  level: Level
  stem: string
  options: string[]
  answer: number
  answerText: string
  points: string[]
  accept: string[]
  why: string
  whyNot: string[]
  tip: string
  bone: string
  notesQuote: string
  ref: string
}
export interface ServerCard {
  front: string
  back: string
  ref: string
  notesQuote: string
}
export interface ServerBatch {
  topic: string
  questions: ServerQuestion[]
  cards: ServerCard[]
  corrections: Correction[]
  conflicts: Conflict[]
  review: { kept: number; fixed: number; dropped: number }
}

/** A part of the material sent for the set: its reference, its part id (to open it), its topic. */
export interface SentPart {
  ref: string
  partId: string
  topic: string
}

/** A saved set. */
export interface NoteSet {
  id: string
  title: string
  createdAt: string
  settings: NotesSettings
  /** A module (course or unit) the student files the set under. */
  module?: string
  /** What it was made from: the files, and (v2) every part sent. */
  from: { pages?: number; pdf?: boolean; typed?: boolean; files?: string[] }
  parts?: SentPart[]
  /** v1 only: the text read from photographed notes. */
  transcript?: string
  corrections: Correction[]
  conflicts?: Conflict[]
  questions: Question[]
  /** Flashcards written for this set (also added to My cards). */
  cards?: { id: string; front: string; back: string; ref: string; refPart?: string }[]
  review: { kept: number; fixed: number; dropped: number }
  /** v2: still being written, finished, stopped (Atlas closed) or failed; and topics that failed. */
  status?: 'writing' | 'done' | 'stopped' | 'error'
  progress?: { done: number; total: number }
  errors?: string[]
  /** Mock exam: when it was finished (answers then shown). */
  finishedAt?: string
}

export const AI_SOURCE = 'Written from your notes by Atlas AI (Claude, by Anthropic) and checked by a second, independent AI examiner. Not reviewed by an academic: if anything disagrees with your lecture notes or textbook, trust those.'

/** Generated question ids: `ne-<set id>-<n>`, so they never collide with the built-in bank. */
export const isGeneratedId = (qid: string) => qid.startsWith('ne-')

export function toQuestions(setId: string, qs: ServerQuestion[], opts: { start?: number; section?: string; parts?: SentPart[] } = {}): Question[] {
  const byRef = new Map((opts.parts ?? []).map((p) => [p.ref, p.partId]))
  return qs.map((q, k) => ({
    id: `ne-${setId}-${(opts.start ?? 0) + k + 1}`,
    topic: `notes:${setId}`,
    type: q.type,
    frequency: q.frequency,
    level: q.level,
    stem: q.stem,
    ...(q.type === 'sba' || q.type === 'tf' ? { options: q.options, answer: q.answer, ...(q.type === 'sba' ? { whyNot: q.whyNot } : {}) } : { answerText: q.answerText }),
    ...(q.type === 'short' && q.points?.length ? { points: q.points } : {}),
    ...(q.type === 'cloze' && q.accept?.length ? { accept: q.accept } : {}),
    why: q.why,
    tip: q.tip,
    bone: q.bone,
    notesQuote: q.notesQuote?.trim() || undefined,
    ...(q.ref ? { ref: q.ref, refPart: byRef.get(q.ref) } : {}),
    ...(opts.section ? { section: opts.section } : {}),
    source: { kind: 'ai', ref: AI_SOURCE },
    reviewStatus: 'ai',
  }))
}

export const useNoteSets = create<{
  sets: Record<string, NoteSet>
  ready: boolean
  load: () => Promise<void>
  save: (s: NoteSet) => Promise<void>
  remove: (id: string) => Promise<void>
}>((set, get) => ({
  sets: {},
  ready: false,
  load: async () => {
    if (get().ready) return
    const list = await getAll<NoteSet>('noteSets').catch(() => [] as NoteSet[])
    // A set still being written when Atlas closed keeps what arrived, and says so.
    const fixed = list.map((s) => (s.status === 'writing' && !jobs.has(s.id) ? { ...s, status: 'stopped' as const } : s))
    set((st) => ({ sets: { ...Object.fromEntries(fixed.map((s) => [s.id, s])), ...st.sets }, ready: true }))
  },
  save: async (s) => {
    set((st) => ({ sets: { ...st.sets, [s.id]: s } }))
    persistStorage()
    await putAll('noteSets', [s])
  },
  remove: async (id) => {
    jobs.get(id)?.abort()
    set((st) => {
      const { [id]: _gone, ...rest } = st.sets
      void _gone
      return { sets: rest }
    })
    await removeAll('noteSets', [id])
  },
}))

/** The saved set and position of a generated question, for My Notes and "jump back". */
export function generatedQuestion(qid: string): { set: NoteSet; q: Question; n: number } | undefined {
  if (!isGeneratedId(qid)) return undefined
  for (const s of Object.values(useNoteSets.getState().sets)) {
    const k = s.questions.findIndex((q) => q.id === qid)
    if (k >= 0) return { set: s, q: s.questions[k], n: k + 1 }
  }
  return undefined
}

/** Newest first. */
export const sortedSets = (sets: Record<string, NoteSet>) => Object.values(sets).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

// ——— The server ———

/**
 * Where the Notes to Exam server is. Set VITE_NOTES_API_URL at build time (e.g. https://notes.example.org); in
 * development the Vite dev server proxies /api to a local server on :8787. Empty means not set up.
 */
export const API_BASE: string | null = import.meta.env.VITE_NOTES_API_URL ? String(import.meta.env.VITE_NOTES_API_URL).replace(/\/$/, '') : import.meta.env.DEV ? '' : null
export const apiReady = () => API_BASE !== null

/** A random id for this device, so the server can share its hourly limit fairly. Not linked to the student. */
export function clientId(): string {
  const KEY = 'atlas.notes.client'
  try {
    const old = localStorage.getItem(KEY)
    if (old) return old
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return 'anonymous'
  }
}

export class NotesError extends Error {}

export interface StreamHandlers {
  progress: (done: number, total: number) => void
  batch: (b: ServerBatch) => void
  chunkError: (topic: string, message: string) => void
}

/**
 * Ask for a set and read the stream of server-sent events: progress, a batch as each topic is checked, a chunkError
 * for a topic that failed, then done (or error). Rejects with NotesError (a message fit to show) or an AbortError.
 */
export async function streamSet(
  body: { parts: { ref: string; topic: string; text: string }[]; focus?: string[] } & NotesSettings,
  on: StreamHandlers,
  signal?: AbortSignal,
): Promise<{ batches: number; items: number }> {
  if (API_BASE === null) throw new NotesError('Notes to Exam is not set up on this copy of Atlas yet.')
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/notes-to-exam`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atlas-Client': clientId() }, body: JSON.stringify(body), signal })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new NotesError('Atlas could not reach the question service. Check your connection and try again.')
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new NotesError(data?.error ?? (res.status === 413 ? 'The chosen topics are too long for one set. Choose fewer topics.' : 'The question service is not available just now. Please try again.'))
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    let chunk: ReadableStreamReadResult<string>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (signal?.aborted) throw e
      throw new NotesError('The connection was lost while your questions were being written. Those already written are kept.')
    }
    if (chunk.done) break
    buf += chunk.value
    let end: number
    while ((end = buf.indexOf('\n\n')) >= 0) {
      const ev = parseEvent(buf.slice(0, end))
      buf = buf.slice(end + 2)
      if (!ev) continue
      const d = ev.data as Record<string, unknown>
      if (ev.event === 'progress') on.progress(d.done as number, d.total as number)
      else if (ev.event === 'batch') on.batch(ev.data as ServerBatch)
      else if (ev.event === 'chunkError') on.chunkError(d.topic as string, d.message as string)
      else if (ev.event === 'done') return ev.data as { batches: number; items: number }
      else if (ev.event === 'error') throw new NotesError(d.message as string)
    }
  }
  throw new NotesError('The connection was lost while your questions were being written. Those already written are kept.')
}

/** One server-sent event block → its name and JSON data (comments and pings → null). */
export function parseEvent(block: string): { event: string; data: unknown } | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (!data.length) return null
  try {
    return { event, data: JSON.parse(data.join('\n')) }
  } catch {
    return null
  }
}

/** Mark a short answer against its points (Notes to Exam marking service). */
export async function markShortAnswer(q: Pick<Question, 'stem' | 'answerText' | 'points'>, answer: string): Promise<Mark> {
  if (API_BASE === null) throw new NotesError('Marking needs the Atlas question service, which is not set up on this copy of Atlas.')
  const points = q.points?.length ? q.points : [q.answerText ?? '']
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/notes/mark`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atlas-Client': clientId() }, body: JSON.stringify({ stem: q.stem, model: q.answerText ?? '', points, answer }) })
  } catch {
    throw new NotesError('Atlas could not reach the marking service. Check your connection and try again.')
  }
  const data = (await res.json().catch(() => null)) as (Mark & { error?: string }) | null
  if (!res.ok || !data || typeof data.score !== 'number') throw new NotesError(data?.error ?? 'Your answer could not be marked just now. Please try again.')
  return data
}

// ——— Writing a set: the job runs in the background while the student reads ———

const jobs = new Map<string, AbortController>()

const uniqueBy = <T>(items: T[], key: (t: T) => string) => {
  const seen = new Set<string>()
  return items.filter((t) => !seen.has(key(t)) && !!seen.add(key(t)))
}
export const isWriting = (id: string) => jobs.has(id)

/** A short title from the chosen topics: "Rotator cuff and 2 more". */
export const titleFor = (topics: string[], mode: Mode) =>
  `${mode === 'mock' ? 'Mock exam: ' : mode === 'weak' ? 'Weak spots: ' : ''}${topics[0] ?? 'Your notes'}${topics.length > 1 ? ` and ${topics.length - 1} more` : ''}`

/**
 * Start writing a set: it is saved at once (status "writing") and filled batch by batch as the server sends them.
 * `onCards` receives each batch of flashcards (to add to My cards). Resolves when the set is finished.
 */
export async function startSet(opts: {
  settings: NotesSettings
  module?: string
  parts: (SentPart & { text: string })[]
  files: string[]
  focus?: string[]
  onCards?: (cards: { front: string; back: string; ref: string; refPart?: string }[], set: NoteSet) => { id: string }[]
}): Promise<string> {
  const id = crypto.randomUUID().slice(0, 8)
  const topics = [...new Set(opts.parts.map((p) => p.topic))]
  const store = useNoteSets.getState()
  const sent = opts.parts.map(({ ref, partId, topic }) => ({ ref, partId, topic }))
  let current: NoteSet = {
    id,
    title: titleFor(topics, opts.settings.mode),
    createdAt: new Date().toISOString(),
    settings: opts.settings,
    module: opts.module?.trim() || undefined,
    from: { files: opts.files },
    parts: sent,
    corrections: [],
    conflicts: [],
    questions: [],
    cards: [],
    review: { kept: 0, fixed: 0, dropped: 0 },
    status: 'writing',
    progress: { done: 0, total: 0 },
    errors: [],
  }
  await store.save(current)
  const ctrl = new AbortController()
  jobs.set(id, ctrl)
  const update = (f: (s: NoteSet) => NoteSet) => {
    current = f(useNoteSets.getState().sets[id] ?? current)
    void useNoteSets.getState().save(current)
  }
  void streamSet(
    { ...opts.settings, parts: opts.parts.map(({ ref, topic, text }) => ({ ref, topic, text })), focus: opts.focus },
    {
      progress: (done, total) => update((s) => ({ ...s, progress: { done, total } })),
      batch: (b) =>
        update((s) => {
          const questions = [...s.questions, ...toQuestions(id, b.questions, { start: s.questions.length, section: b.topic, parts: sent })]
          const byRef = new Map(sent.map((p) => [p.ref, p.partId]))
          const cards = b.cards.map((c) => ({ ...c, refPart: byRef.get(c.ref) }))
          const added = cards.length && opts.onCards ? opts.onCards(cards, s) : []
          return {
            ...s,
            questions,
            cards: [...(s.cards ?? []), ...cards.map((c, k) => ({ id: added[k]?.id ?? `${id}-${(s.cards?.length ?? 0) + k}`, front: c.front, back: c.back, ref: c.ref, refPart: c.refPart }))],
            // A topic split over two batches can report the same finding twice: keep one of each.
            corrections: uniqueBy([...s.corrections, ...b.corrections], (c) => `${c.ref}|${c.quote}|${c.correction}`),
            conflicts: uniqueBy([...(s.conflicts ?? []), ...b.conflicts], (c) => [`${c.refA}|${c.quoteA}`, `${c.refB}|${c.quoteB}`].sort().join('|')),
            review: { kept: s.review.kept + b.review.kept, fixed: s.review.fixed + b.review.fixed, dropped: s.review.dropped + b.review.dropped },
          }
        }),
      chunkError: (topic, message) => update((s) => ({ ...s, errors: [...(s.errors ?? []), `${topic}: ${message}`] })),
    },
    ctrl.signal,
  )
    .then(() => update((s) => ({ ...s, status: 'done' })))
    .catch((e) => {
      if (ctrl.signal.aborted) return update((s) => ({ ...s, status: s.questions.length || s.cards?.length ? 'stopped' : 'error', errors: [...(s.errors ?? []), 'Stopped.'] }))
      update((s) => ({ ...s, status: s.questions.length || s.cards?.length ? 'stopped' : 'error', errors: [...(s.errors ?? []), e instanceof NotesError ? e.message : 'Something went wrong. Please try again.'] }))
    })
    .finally(() => jobs.delete(id))
  return id
}

export const stopSet = (id: string) => jobs.get(id)?.abort()

// ——— Spaced review of generated questions (FSRS) ———

/** The scheduler key of a generated question. */
export const reviewKey = (qid: string) => `nq:${qid}`

/** Generated questions due for review now, earliest first. */
export function dueQuestions(sets: Record<string, NoteSet>, cards: Record<string, StoredCard>, now = new Date()): { q: Question; set: NoteSet }[] {
  const out: { q: Question; set: NoteSet; due: string }[] = []
  for (const s of Object.values(sets))
    for (const q of s.questions) {
      const c = cards[reviewKey(q.id)]
      if (c && new Date(c.due) <= now) out.push({ q, set: s, due: c.due })
    }
  return out.sort((a, b) => a.due.localeCompare(b.due)).map(({ q, set }) => ({ q, set }))
}

// ——— Coverage and gaps ———

export interface PartCoverage {
  ref: string
  partId: string
  topic: string
  questions: number
  answered: number
  correct: number
}

/** For each part sent: how many questions test it, how many are answered, how many right. */
export function coverage(set: NoteSet, answers: Record<string, ExamAnswer>): PartCoverage[] {
  return (set.parts ?? []).map((p) => {
    const qs = set.questions.filter((q) => q.ref === p.ref)
    const done = qs.filter((q) => answers[q.id])
    return { ...p, questions: qs.length, answered: done.length, correct: done.filter((q) => isCorrect(q, answers[q.id])).length }
  })
}

/** By topic: parts with no questions (gaps), and accuracy where answered. */
export function topicCoverage(set: NoteSet, answers: Record<string, ExamAnswer>) {
  const rows = coverage(set, answers)
  const topics = [...new Set(rows.map((r) => r.topic))]
  return topics.map((topic) => {
    const rs = rows.filter((r) => r.topic === topic)
    const answered = rs.reduce((n, r) => n + r.answered, 0)
    const correct = rs.reduce((n, r) => n + r.correct, 0)
    return { topic, parts: rs.length, tested: rs.filter((r) => r.questions).length, gaps: rs.filter((r) => !r.questions), answered, correct, accuracy: answered ? correct / answered : null }
  })
}

/** The points the student got wrong in a set: the stems of missed questions, and the parts they cite. */
export function missedIn(set: NoteSet, answers: Record<string, ExamAnswer>): { stems: string[]; refs: string[] } {
  const missed = set.questions.filter((q) => answers[q.id] && !isCorrect(q, answers[q.id]))
  return { stems: missed.map((q) => q.stem), refs: [...new Set(missed.flatMap((q) => (q.ref ? [q.ref] : [])))] }
}
