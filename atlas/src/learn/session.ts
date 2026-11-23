import { create } from 'zustand'
import type { Bone } from '../data/types'
import type { Verdict } from './answer'

export type Mode = 'typing' | 'quiz' | 'weak' | 'flashcards'
export type Kind = 'type' | 'choice' | 'tap'

export interface Item {
  bone: Bone
  kind: Kind
}
export interface Result {
  bone: Bone
  kind: Kind
  verdict: Verdict
  answer: string // what the student typed, chose or tapped
  ms: number
}

/** The running study session (not persisted). */
export const useSession = create<{
  mode: Mode | null
  open: (mode: Mode) => void
  close: () => void
}>((set) => ({
  mode: null,
  open: (mode) => set({ mode }),
  close: () => set({ mode: null }),
}))

export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

export const MODE_INFO: Record<Mode, { title: string; blurb: string }> = {
  typing: { title: 'Spelling Quiz', blurb: 'A bone lights up. Type its name.' },
  flashcards: { title: 'Flashcards', blurb: 'Spaced repetition (FSRS): name the bone, find the bone.' },
  quiz: { title: 'Quiz', blurb: 'Timed multiple choice and “tap the bone”.' },
  weak: { title: 'Weak Bones', blurb: 'The bones you miss most, mixed across question types.' },
}
