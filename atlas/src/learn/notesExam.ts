import { create } from 'zustand'
import { getAll, persistStorage, putAll, removeAll } from '../lib/idb'
import type { Level, Question } from './questions'

/**
 * Notes to Exam: the student photographs (or uploads, or types) their own anatomy notes; the Atlas server sends them
 * to Claude, which transcribes them and sets exam-style questions on them; a second, independent pass checks every
 * question. The API key lives on the server only. Photos are sent once and never stored, here or there; a finished
 * set (the text read from the notes, the corrections and the questions) is kept on this device only.
 */

export type Mix = 'sba' | 'mixed'
export interface NotesSettings {
  count: 5 | 10 | 15
  level: Level
  mix: Mix
}

export interface Correction {
  quote: string
  problem: string
  correction: string
}

/** A question as the server returns it. */
export interface ServerQuestion {
  type: 'sba' | 'short'
  frequency: Question['frequency']
  level: Level
  stem: string
  options: string[]
  answer: number
  answerText: string
  why: string
  whyNot: string[]
  tip: string
  bone: string
  notesQuote: string
}

export interface ServerResult {
  status: 'ok' | 'unreadable' | 'not_anatomy'
  message: string
  title: string
  transcript: string
  corrections: Correction[]
  questions: ServerQuestion[]
  review: { kept: number; fixed: number; dropped: number }
}

/** A saved set. */
export interface NoteSet {
  id: string
  title: string
  createdAt: string
  settings: NotesSettings
  /** What was sent: page photos, a PDF, typed text. */
  from: { pages: number; pdf: boolean; typed: boolean; files?: string[] }
  transcript: string
  corrections: Correction[]
  questions: Question[]
  review: ServerResult['review']
}

export const AI_SOURCE = 'Written from your notes by Atlas AI (Claude, by Anthropic) and checked by a second, independent AI examiner. Not reviewed by an academic: if anything disagrees with your lecture notes or textbook, trust those.'

/** Generated question ids: `ne-<set id>-<n>`, so they never collide with the built-in bank. */
export const isGeneratedId = (qid: string) => qid.startsWith('ne-')

export function toQuestions(setId: string, qs: ServerQuestion[]): Question[] {
  return qs.map((q, k) => ({
    id: `ne-${setId}-${k + 1}`,
    topic: `notes:${setId}`,
    type: q.type,
    frequency: q.frequency,
    level: q.level,
    stem: q.stem,
    ...(q.type === 'sba' ? { options: q.options, answer: q.answer, whyNot: q.whyNot } : { answerText: q.answerText }),
    why: q.why,
    tip: q.tip,
    bone: q.bone,
    notesQuote: q.notesQuote.trim() || undefined,
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
    set({ sets: Object.fromEntries(list.map((s) => [s.id, s])), ready: true })
  },
  save: async (s) => {
    set((st) => ({ sets: { ...st.sets, [s.id]: s } }))
    persistStorage()
    await putAll('noteSets', [s])
  },
  remove: async (id) => {
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

export interface NotesInput {
  images: { mediaType: 'image/jpeg'; data: string }[]
  pdf?: string
  text?: string
}

export class NotesError extends Error {}

export type Stage = 'sending' | 'reading' | 'checking'

/**
 * Send the notes and wait for the set. Progress arrives as server-sent events on the same response; `onStage` is
 * called as each pass starts. Rejects with NotesError (a message fit to show) or an AbortError when cancelled.
 */
export async function requestSet(input: NotesInput, settings: NotesSettings, onStage: (s: Stage) => void, signal?: AbortSignal): Promise<ServerResult> {
  if (API_BASE === null) throw new NotesError('Notes to Exam is not set up on this copy of Atlas yet.')
  onStage('sending')
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/notes-to-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Atlas-Client': clientId() },
      body: JSON.stringify({ ...input, ...settings }),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new NotesError('Atlas could not reach the question service. Check your connection and try again.')
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new NotesError(body?.error ?? (res.status === 413 ? 'The notes are too large. Use fewer pages.' : 'The question service is not available just now. Please try again.'))
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    let chunk: ReadableStreamReadResult<string>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (signal?.aborted) throw e
      throw new NotesError('The connection was lost while your questions were being written. Please try again.')
    }
    if (chunk.done) break
    buf += chunk.value
    let end: number
    while ((end = buf.indexOf('\n\n')) >= 0) {
      const ev = parseEvent(buf.slice(0, end))
      buf = buf.slice(end + 2)
      if (!ev) continue
      if (ev.event === 'stage') onStage((ev.data as { stage: Stage }).stage)
      else if (ev.event === 'result') return ev.data as ServerResult
      else if (ev.event === 'error') throw new NotesError((ev.data as { message: string }).message)
    }
  }
  throw new NotesError('The connection was lost while your questions were being written. Please try again.')
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

export const LIMITS = { pages: 12, pdfBytes: 20 * 1024 * 1024, textChars: 40000 }
