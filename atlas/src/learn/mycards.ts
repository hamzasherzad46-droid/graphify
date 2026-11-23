import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import type { Annotation } from './annotations'
import { locate } from './anchor'

/**
 * Flashcards the student makes from a highlight or a note ("Turn into flashcard"). Scheduled with FSRS like every
 * other card: the scheduling state lives in useProgress.cards under `mine:<id>`.
 */
export interface MyCard {
  id: string
  front: string
  back: string
  /** Where it came from, to show and to jump back to. */
  from: { annotation: string; doc: string; docLabel: string }
  createdAt: string
  deletedAt?: string
}
export const cardKey = (c: Pick<MyCard, 'id'>) => `mine:${c.id}`

export const useMyCards = create<{
  cards: Record<string, MyCard>
  add: (c: Omit<MyCard, 'id' | 'createdAt'>) => MyCard
  remove: (id: string) => void
}>()(
  persist(
    (set) => ({
      cards: {},
      add: (c) => {
        const card: MyCard = { ...c, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }
        set((s) => ({ cards: { ...s.cards, [card.id]: card } }))
        return card
      },
      remove: (id) => set((s) => (s.cards[id] ? { cards: { ...s.cards, [id]: { ...s.cards[id], deletedAt: new Date().toISOString() } } } : {})),
    }),
    { name: 'atlas.mycards.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
export const liveCards = (cards: Record<string, MyCard>) => Object.values(cards).filter((c) => !c.deletedAt)

/** The sentence of `text` that contains [start, end). */
export function sentenceAround(text: string, start: number, end: number): { start: number; end: number } {
  let s = start
  while (s > 0 && !/[.!?]\s/.test(text.slice(s - 2, s))) s--
  let e = end
  while (e < text.length && !/[.!?]/.test(text[e - 1] ?? '')) e++
  // A quote that already ends a sentence keeps its full stop out of the blank.
  return { start: s, end: Math.max(e, end) }
}

const BLANK = '_____'

/**
 * A suggested card for a highlight: its sentence with the highlighted words blanked out (front) and the highlighted
 * words (back). When the highlight is a whole sentence (nothing left around the blank), the first half is shown and
 * the rest is the answer. `paragraph` is the full text of the highlight's paragraph, if known.
 */
export function suggestFromHighlight(a: Annotation, paragraph?: string): { front: string; back: string } {
  const seg = a.segs[0]
  const quote = a.segs.map((s) => s.quote).join(' ')
  if (seg && a.segs.length === 1) {
    const text = paragraph ?? seg.prefix + seg.quote + seg.suffix
    const at = locate(text, paragraph ? seg : { ...seg, start: seg.prefix.length })
    if (at) {
      const sent = sentenceAround(text, at.start, at.end)
      const before = text.slice(sent.start, at.start).trimStart()
      const after = text.slice(at.end, sent.end).trimEnd()
      const cut = !paragraph // context limited to 32 characters either side
      if (before.replace(/\W/g, '').length + after.replace(/\W/g, '').length >= 8)
        return { front: `${cut && sent.start === 0 && seg.prefix.length >= 32 ? '…' : ''}${before}${BLANK}${after}${cut && sent.end >= text.length && seg.suffix.length >= 32 ? '…' : ''}`, back: seg.quote }
    }
  }
  const words = quote.split(/\s+/)
  const half = Math.max(1, Math.floor(words.length / 2))
  return { front: `${words.slice(0, half).join(' ')} ${BLANK}`, back: words.slice(half).join(' ') || quote }
}

/** A suggested card for a note: the text it is attached to (front) and the note (back). */
export function suggestFromNote(a: Annotation, context?: string): { front: string; back: string } {
  const quote = a.segs.map((s) => s.quote).join(' … ')
  const front = !a.segs.length ? (context ?? a.docLabel) : a.scope === 'para' ? (context ?? quote) : quote
  return { front: front.length > 400 ? `${front.slice(0, 398)}…` : front, back: a.note.trim() }
}
