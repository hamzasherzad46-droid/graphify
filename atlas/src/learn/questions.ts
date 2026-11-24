import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'

/**
 * Exam-style questions (content/questions/<topic>.json). Written in the style of anatomy exams, with the reasoning
 * explained; never presented as real exam papers. OpenStax questions keep their original wording (CC BY 4.0) with
 * Atlas explanations; the rest are written by Atlas. Every question has a source reference and a review status.
 */
export type QuestionType = 'sba' | 'short' | 'label'
export type Frequency = 'core' | 'common' | 'advanced'
export type Level = 'foundation' | 'undergraduate' | 'medical'

export interface Question {
  id: string
  topic: string
  type: QuestionType
  frequency: Frequency
  level: Level
  stem: string
  /** sba and label: the options, and the index of the answer. */
  options?: string[]
  answer?: number
  /** short: the model answer. */
  answerText?: string
  /** Why the answer is right (2–4 sentences). */
  why: string
  /** sba and label: one line per option; empty for the answer. */
  whyNot?: string[]
  /** The trap examiners use. */
  tip: string
  /** "See it in 3D". */
  bone: string
  /** label: the bone lit in the 3D model. */
  label?: string
  /** label: how far above the bone to look from, in degrees (default 14); vertebrae read best from above. */
  labelElevation?: number
  /** Questions made from the student's notes: the words of the notes the question tests. */
  notesQuote?: string
  source: { kind: 'openstax' | 'atlas' | 'ai'; ref: string }
  /** 'ai': written from the student's notes by Atlas AI and checked by a second AI pass (Notes to Exam). */
  reviewStatus: 'draft' | 'reviewed' | 'ai'
}

export const FREQUENCY_LABEL: Record<Frequency, string> = { core: 'Core', common: 'Common', advanced: 'Advanced' }
export const LEVEL_LABEL: Record<Level, string> = { foundation: 'Foundation', undergraduate: 'Undergraduate', medical: 'Medical' }
export const TYPE_LABEL: Record<QuestionType, string> = { sba: 'Single best answer', short: 'Short answer', label: 'Label the 3D model' }

const files = import.meta.glob<{ questions: Question[] }>('../../content/questions/*.json', { import: 'default', eager: true })
export const QUESTIONS: Question[] = Object.values(files).flatMap((f) => f.questions)
export const questionsFor = (topic: string) => QUESTIONS.filter((q) => q.topic === topic)

/** What the student did with each question, saved on the device. */
export interface ExamAnswer {
  /** sba / label: the option chosen. */
  choice?: number
  /** short: the answer was shown, and how the student marked themselves. */
  self?: 'knew' | 'missed'
  at: string
}
export const isCorrect = (q: Question, a: ExamAnswer | undefined) => (a ? (q.type === 'short' ? a.self === 'knew' : a.choice === q.answer) : false)
export const isDone = (q: Question, a: ExamAnswer | undefined) => !!a && (q.type === 'short' ? !!a.self : a.choice !== undefined)

export const useExam = create<{
  answers: Record<string, ExamAnswer>
  choose: (qid: string, choice: number) => void
  mark: (qid: string, self: 'knew' | 'missed') => void
  reveal: (qid: string) => void
  reset: (qids: string[]) => void
}>()(
  persist(
    (set) => ({
      answers: {},
      choose: (qid, choice) => set((s) => ({ answers: { ...s.answers, [qid]: { choice, at: new Date().toISOString() } } })),
      reveal: (qid) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], at: new Date().toISOString() } } })),
      mark: (qid, self) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], self, at: new Date().toISOString() } } })),
      reset: (qids) => set((s) => ({ answers: Object.fromEntries(Object.entries(s.answers).filter(([k]) => !qids.includes(k))) })),
    }),
    { name: 'atlas.exam.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
