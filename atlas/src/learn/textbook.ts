import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import indexJson from '../../content/textbook/index.json'

/**
 * The textbook: OpenStax Anatomy and Physiology 2e, chapters 6–9 (CC BY 4.0 release, imported by
 * scripts/import-openstax.mjs). Each section is its own JSON file, loaded when it is opened.
 */
export type Inline =
  | string
  | { k: 'term' | 'em' | 'strong' | 'sup' | 'sub'; t: string; bone?: string }
  | { k: 'bone'; t: string; bone: string }
  | { k: 'ref'; t: string; to: string }

export type Block =
  | { t: 'h'; id: string; level: number; text: string }
  | { t: 'p'; id: string; inl: Inline[] }
  | { t: 'list'; id: string; ordered: boolean; items: Inline[][] }
  | { t: 'fig'; id: string; label: string; title: string; src: string; alt: string; caption: Inline[] }
  | { t: 'table'; id: string; label?: string; title: string; head: Inline[][][]; rows: Inline[][][] }
  | { t: 'note'; id: string; kind: string; label: string; title: string; blocks: Block[] }

export interface ChoiceQuestion {
  id: string
  stem: Inline[]
  options: Inline[][]
  answer: number
}

export interface Section {
  id: string
  num: string
  title: string
  chapter: { num: number; title: string }
  topic: string
  objectives: Inline[][]
  keyPoints: { id: string; lead: Inline[]; rest: Inline[] }[]
  blocks: Block[]
  glossary: { term: string; meaning: string }[]
  quickCheck: ChoiceQuestion[]
  review: ChoiceQuestion[]
  critical: { id: string; stem: Inline[]; answer: Inline[][] }[]
  source: { book: string; publisher: string; module: string; uuid: string; commit: string; license: string; url: string }
  changes: string[]
}

export interface SectionInfo {
  id: string
  num: string
  title: string
  chapter: number
  chapterTitle: string
  topic: string
  keyPoints: number
  figures: number
  words: number
  bones: string[]
}

export const SECTIONS: SectionInfo[] = indexJson.sections
export const sectionInfo = (id: string) => SECTIONS.find((s) => s.id === id)
export const sectionsFor = (topic: string) => SECTIONS.filter((s) => s.topic === topic)
/** Minutes to read at 220 words a minute. */
export const minutes = (s: SectionInfo) => Math.max(1, Math.round(s.words / 220))
/** "7.2 The Skull"; chapter introductions read "Chapter 7: Axial Skeleton". */
export const sectionLabel = (s: { num: string; title: string; chapterTitle?: string; chapter?: number | { title: string } }) =>
  s.num.includes('.') ? `${s.num} ${s.title}` : `Chapter ${s.num}: ${typeof s.chapter === 'object' ? s.chapter.title : s.chapterTitle}`

const files = import.meta.glob<Section>('../../content/textbook/s*.json', { import: 'default' })
const intros = import.meta.glob<Section>('../../content/textbook/ch*.json', { import: 'default' })
export function loadSection(id: string): Promise<Section> {
  const f = files[`../../content/textbook/${id}.json`] ?? intros[`../../content/textbook/${id}.json`]
  if (!f) return Promise.reject(new Error(`No textbook section ${id}`))
  return f()
}

/** Plain text of rich text (labels, search, highlights). */
export const plain = (inl: Inline[]) => inl.map((x) => (typeof x === 'string' ? x : x.t)).join('')

/** Figure files live under public/ ('textbook/…' for OpenStax, 'classic/…' for Gray's). */
export const figureUrl = (src: string) => `${import.meta.env.BASE_URL}${src}`

/** Gray's Anatomy (1918) for a section: the bones' chapters from the classic text. */
export interface Classic {
  section: string
  source: { work: string; author: string; edition: string; publisher: string; year: number; license: string; transcription: string }
  entries: { slug: string; title: string; blocks: Block[] }[]
}
const classics = import.meta.glob<Classic>('../../content/classic/*.json', { import: 'default' })
export const hasClassic = (id: string) => `../../content/classic/${id}.json` in classics
export const loadClassic = (id: string) => classics[`../../content/classic/${id}.json`]!()

/** Reading progress per section (how far, and the paragraph at the top of the screen), saved on the device. */
export interface ReadingMark {
  /** Where the student is now: 0–1 down the section, and the paragraph at the top of the screen. */
  frac: number
  para: string | null
  /** Reached the end at least once. */
  read?: boolean
  at: string
}
export const useReading = create<{
  marks: Record<string, ReadingMark>
  last: string | null
  /** Reader text size in px. */
  size: number
  mark: (id: string, m: Omit<ReadingMark, 'at' | 'read'> & { read?: boolean }) => void
  setSize: (px: number) => void
  /** Quick check answers per question id: the option chosen. */
  checks: Record<string, number>
  answer: (qid: string, option: number) => void
  reset: (qids: string[]) => void
}>()(
  persist(
    (set) => ({
      marks: {},
      last: null,
      size: 17.5,
      mark: (id, m) =>
        set((s) => ({
          last: id,
          marks: { ...s.marks, [id]: { frac: Math.min(1, Math.max(m.frac, 0)), para: m.para, read: m.read || s.marks[id]?.read || m.frac >= 0.98, at: new Date().toISOString() } },
        })),
      setSize: (size) => set({ size }),
      checks: {},
      answer: (qid, option) => set((s) => ({ checks: { ...s.checks, [qid]: option } })),
      reset: (qids) => set((s) => ({ checks: Object.fromEntries(Object.entries(s.checks).filter(([k]) => !qids.includes(k))) })),
    }),
    { name: 'atlas.reading.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
