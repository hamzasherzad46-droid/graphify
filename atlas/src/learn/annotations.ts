import { create } from 'zustand'
import { getAll, persistStorage, putAll } from '../lib/idb'
import type { Segment } from './anchor'

export const COLORS = ['yellow', 'teal', 'pink', 'blue'] as const
export type HighlightColor = (typeof COLORS)[number]

/**
 * A highlight or note the student made. Saved on the device the moment it is made (IndexedDB), with a synchronous
 * journal in localStorage until IndexedDB confirms, so nothing is lost even if the app is closed straight away.
 * Deleting keeps a tombstone (`deletedAt`) so a later cloud sync knows what was removed.
 */
export interface Annotation {
  id: string
  /** Where: 'tb:<section id>' for the textbook, 'eq:<question id>' for exam-style questions. */
  doc: string
  /** What the student sees for `doc` ("7.2 The Skull"), for My Highlights and My Notes. */
  docLabel: string
  /** The text it is attached to, one segment per paragraph. Empty for a note on a whole question. */
  segs: Segment[]
  /** Null for a note without highlighting. */
  color: HighlightColor | null
  note: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

const JOURNAL = 'atlas.annotations.journal'

const readJournal = (): Record<string, Annotation> => {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL) ?? '{}')
  } catch {
    return {}
  }
}

/** Save one annotation: journal first (synchronous), then IndexedDB; the journal entry is dropped once it commits. */
function save(a: Annotation) {
  try {
    localStorage.setItem(JOURNAL, JSON.stringify({ ...readJournal(), [a.id]: a }))
  } catch {
    /* storage full: IndexedDB still gets it */
  }
  putAll('annotations', [a])
    .then(() => {
      const j = readJournal()
      if (j[a.id]?.updatedAt === a.updatedAt) {
        delete j[a.id]
        localStorage.setItem(JOURNAL, JSON.stringify(j))
      }
    })
    .catch(() => {
      /* stays in the journal; replayed next launch */
    })
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export const useAnnotations = create<{
  items: Record<string, Annotation>
  ready: boolean
  load: () => Promise<void>
  add: (a: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Annotation
  update: (id: string, patch: Partial<Pick<Annotation, 'color' | 'note' | 'segs'>>) => void
  remove: (id: string) => void
}>((set, get) => ({
  items: {},
  ready: false,
  load: async () => {
    persistStorage()
    let stored: Annotation[]
    try {
      stored = await getAll<Annotation>('annotations')
    } catch {
      stored = []
    }
    const items: Record<string, Annotation> = {}
    for (const a of stored) items[a.id] = a
    // Anything the journal holds that IndexedDB didn't get (or got an older copy of) wins, and is written again.
    const journal = readJournal()
    const replay = Object.values(journal).filter((a) => !items[a.id] || items[a.id].updatedAt < a.updatedAt)
    for (const a of replay) items[a.id] = a
    set({ items, ready: true })
    if (replay.length)
      putAll('annotations', replay)
        .then(() => localStorage.removeItem(JOURNAL))
        .catch(() => {})
    else if (Object.keys(journal).length) localStorage.removeItem(JOURNAL)
  },
  add: (a) => {
    const now = new Date().toISOString()
    const full: Annotation = { ...a, id: uid(), createdAt: now, updatedAt: now }
    set((s) => ({ items: { ...s.items, [full.id]: full } }))
    save(full)
    return full
  },
  update: (id, patch) => {
    const prev = get().items[id]
    if (!prev) return
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString() }
    set((s) => ({ items: { ...s.items, [id]: next } }))
    save(next)
  },
  remove: (id) => {
    const prev = get().items[id]
    if (!prev) return
    const now = new Date().toISOString()
    const next = { ...prev, deletedAt: now, updatedAt: now }
    set((s) => ({ items: { ...s.items, [id]: next } }))
    save(next)
  },
}))

/** Live (not deleted) annotations of one document. */
export const liveFor = (items: Record<string, Annotation>, doc: string) => Object.values(items).filter((a) => a.doc === doc && !a.deletedAt)
