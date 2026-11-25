import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import { canon } from './answer'
import { editDistance } from '../data/search'

/**
 * Exam-style questions (content/questions/<topic>.json). Written in the style of anatomy exams, with the reasoning
 * explained; never presented as real exam papers. OpenStax questions keep their original wording (CC BY 4.0) with
 * Atlas explanations; the rest are written by Atlas. Every question has a source reference and a review status.
 */
export type QuestionType = 'sba' | 'short' | 'label' | 'tf' | 'cloze'
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
  /** short: the model answer. cloze: the missing word or words. */
  answerText?: string
  /** short (from the student's notes): the marking points, for AI marking. */
  points?: string[]
  /** cloze: other answers that are equally correct. */
  accept?: string[]
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
  /** …and where they are: "Lecture 3, slide 12", and the part's id (to open it). */
  ref?: string
  refPart?: string
  /** …and the topic of the set it belongs to. */
  section?: string
  source: { kind: 'openstax' | 'atlas' | 'ai'; ref: string }
  /** 'ai': written from the student's notes by Atlas AI and checked by a second AI pass (Notes to Exam). */
  reviewStatus: 'draft' | 'reviewed' | 'ai'
}

export const FREQUENCY_LABEL: Record<Frequency, string> = { core: 'Core', common: 'Common', advanced: 'Advanced' }
export const LEVEL_LABEL: Record<Level, string> = { foundation: 'Foundation', undergraduate: 'Undergraduate', medical: 'Medical' }
export const TYPE_LABEL: Record<QuestionType, string> = { sba: 'Single best answer', short: 'Short answer', label: 'Label the 3D model', tf: 'True or false', cloze: 'Fill in the blank' }

const files = import.meta.glob<{ questions: Question[] }>('../../content/questions/*.json', { import: 'default', eager: true })
export const QUESTIONS: Question[] = Object.values(files).flatMap((f) => f.questions)
export const questionsFor = (topic: string) => QUESTIONS.filter((q) => q.topic === topic)

/** A short answer marked against its points (Notes to Exam marking). */
export interface Mark {
  score: number
  max: number
  points: { point: string; hit: boolean; evidence: string }[]
  tip: string
}

/** What the student did with each question, saved on the device. */
export interface ExamAnswer {
  /** sba / label / tf: the option chosen. */
  choice?: number
  /** cloze and short: what the student wrote. */
  text?: string
  /** short: how the student marked themselves, or the AI mark. */
  self?: 'knew' | 'missed'
  mark?: Mark
  at: string
}

/** A short answer counts as right at 60% of its points or more. */
export const PASS_MARK = 0.6

/** A fill-in answer: right, nearly right (one slip in a longer word: counted right, with a spelling note) or wrong. */
export function checkCloze(q: Question, typed: string): 'correct' | 'close' | 'wrong' {
  // A leading article is not part of the answer ("the scaphoid" = "scaphoid").
  const bare = (s: string) => canon(s.trim().replace(/^(the|an?)\s+/i, ''))
  const t = bare(typed)
  if (!t) return 'wrong'
  const accepted = [q.answerText ?? '', ...(q.accept ?? [])].map(bare).filter(Boolean)
  if (accepted.includes(t)) return 'correct'
  return accepted.some((a) => a.length >= 5 && editDistance(a, t) <= 1) ? 'close' : 'wrong'
}

export function isCorrect(q: Question, a: ExamAnswer | undefined): boolean {
  if (!a) return false
  if (q.type === 'cloze') return a.text !== undefined && checkCloze(q, a.text) !== 'wrong'
  if (q.type === 'short') return a.mark ? a.mark.score / a.mark.max >= PASS_MARK : a.self === 'knew'
  return a.choice === q.answer
}
export function isDone(q: Question, a: ExamAnswer | undefined): boolean {
  if (!a) return false
  if (q.type === 'cloze') return a.text !== undefined
  if (q.type === 'short') return !!a.self || !!a.mark
  return a.choice !== undefined
}

export const useExam = create<{
  answers: Record<string, ExamAnswer>
  choose: (qid: string, choice: number) => void
  mark: (qid: string, self: 'knew' | 'missed') => void
  reveal: (qid: string) => void
  /** cloze and short: what the student wrote. */
  write: (qid: string, text: string) => void
  setMark: (qid: string, mark: Mark) => void
  reset: (qids: string[]) => void
}>()(
  persist(
    (set) => ({
      answers: {},
      choose: (qid, choice) => set((s) => ({ answers: { ...s.answers, [qid]: { choice, at: new Date().toISOString() } } })),
      reveal: (qid) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], at: new Date().toISOString() } } })),
      mark: (qid, self) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], self, at: new Date().toISOString() } } })),
      write: (qid, text) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], text, at: new Date().toISOString() } } })),
      setMark: (qid, mark) => set((s) => ({ answers: { ...s.answers, [qid]: { ...s.answers[qid], mark, at: new Date().toISOString() } } })),
      reset: (qids) => set((s) => ({ answers: Object.fromEntries(Object.entries(s.answers).filter(([k]) => !qids.includes(k))) })),
    }),
    { name: 'atlas.exam.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
