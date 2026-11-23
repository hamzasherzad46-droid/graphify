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
  launcher: boolean
  progress: boolean
  setProgress: (on: boolean) => void
  open: (mode: Mode) => void
  close: () => void
  setLauncher: (on: boolean) => void
}>((set) => ({
  mode: null,
  launcher: false,
  progress: false,
  setProgress: (progress) => set({ progress }),
  open: (mode) => set({ mode, launcher: false, progress: false }),
  close: () => set({ mode: null }),
  setLauncher: (launcher) => set({ launcher }),
}))

export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

export const MODE_INFO: Record<Mode, { title: string; blurb: string }> = {
  typing: { title: 'Typing Test', blurb: 'A bone lights up. Type its name.' },
  flashcards: { title: 'Flashcards', blurb: 'Spaced repetition (FSRS): name the bone, find the bone.' },
  quiz: { title: 'Quiz', blurb: 'Timed multiple choice and “tap the bone”.' },
  weak: { title: 'Weak Bones', blurb: 'The bones you miss most, mixed across question types.' },
}
