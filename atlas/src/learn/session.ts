import { create } from 'zustand'
import type { Bone } from '../data/types'
import type { Verdict } from './answer'

export type Mode = 'typing' | 'quiz' | 'weak' | 'flashcards' | 'mycards' | 'layered'
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
  /** Start straight away with the saved settings (Continue), instead of the mode's setup screen. */
  autostart: boolean
  /** Layered flashcards: only the cards on these bones (opened from a structure lesson). */
  bones: string[] | null
  open: (mode: Mode, opts?: { autostart?: boolean; bones?: string[] }) => void
  close: () => void
}>((set) => ({
  mode: null,
  autostart: false,
  bones: null,
  open: (mode, opts) => set({ mode, autostart: !!opts?.autostart, bones: opts?.bones ?? null }),
  close: () => set({ mode: null, autostart: false, bones: null }),
}))

export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

export const MODE_INFO: Record<Mode, { title: string; blurb: string }> = {
  typing: { title: 'Spelling Quiz', blurb: 'Spell each bone in a focused set, letter by letter.' },
  flashcards: { title: 'Flashcards', blurb: 'Spaced repetition (FSRS): name the bone, find the bone.' },
  quiz: { title: 'Quiz', blurb: 'Timed multiple choice and “tap the bone”.' },
  weak: { title: 'Weak Bones', blurb: 'The bones you miss most, mixed across question types.' },
  mycards: { title: 'My cards', blurb: 'Flashcards you made from your highlights and notes.' },
  layered: { title: 'Layered flashcards', blurb: 'The answer first, then Why, Go deeper and Clinical, as deep as you want.' },
}
