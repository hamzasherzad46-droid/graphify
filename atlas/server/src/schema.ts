import { z } from 'zod'

/**
 * What the model must return, twice over: a JSON schema the API enforces (structured outputs), and zod schemas that
 * check the result again in code, including the rules a JSON schema cannot express (exactly four options, the blank
 * "why not" line under the answer, and so on). A question that fails is dropped, never shown.
 */

export const LEVELS = ['foundation', 'undergraduate', 'medical'] as const
export const FREQUENCIES = ['core', 'common', 'advanced'] as const
export const STATUSES = ['ok', 'unreadable', 'not_anatomy'] as const

const question = (boneIds: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['type', 'frequency', 'level', 'stem', 'options', 'answer', 'answerText', 'why', 'whyNot', 'tip', 'bone', 'notesQuote'],
  properties: {
    type: { type: 'string', enum: ['sba', 'short'], description: 'sba = single best answer with four options; short = short answer.' },
    frequency: { type: 'string', enum: [...FREQUENCIES] },
    level: { type: 'string', enum: [...LEVELS] },
    stem: { type: 'string' },
    options: { type: 'array', items: { type: 'string' }, description: 'sba: exactly four options. short: empty.' },
    answer: { type: 'integer', description: 'sba: index (0-3) of the single best answer. short: -1.' },
    answerText: { type: 'string', description: 'short: the model answer, as a marking scheme. sba: empty.' },
    why: { type: 'string', description: 'Why this is the answer: two to four sentences.' },
    whyNot: { type: 'array', items: { type: 'string' }, description: 'sba: one line per option, in option order, empty string for the answer. short: empty.' },
    tip: { type: 'string', description: 'The exam tip: the trap examiners set on this point.' },
    bone: { type: 'string', enum: ['', ...boneIds], description: 'The Atlas bone id most relevant to the question, or empty.' },
    notesQuote: { type: 'string', description: 'The words of the transcript this question tests.' },
  },
})

/** First pass: read the notes and write the questions. */
export const authorJsonSchema = (boneIds: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['status', 'message', 'transcript', 'title', 'corrections', 'questions'],
  properties: {
    status: { type: 'string', enum: [...STATUSES] },
    message: { type: 'string', description: 'For a status other than ok: one sentence for the student. Otherwise empty.' },
    transcript: { type: 'string', description: 'A faithful transcription of the notes, with [illegible] where words cannot be read.' },
    title: { type: 'string', description: 'A short title for the set, from the notes (for example "Bones of the forearm").' },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'problem', 'correction'],
        properties: { quote: { type: 'string' }, problem: { type: 'string' }, correction: { type: 'string' } },
      },
    },
    questions: { type: 'array', items: question(boneIds) },
  },
})

/** Second pass: the examiner's checked set, with a verdict on each question it was given. */
export const examinerJsonSchema = (boneIds: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['corrections', 'questions', 'review'],
  properties: {
    corrections: authorJsonSchema(boneIds).properties.corrections,
    questions: { type: 'array', items: question(boneIds) },
    review: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'verdict', 'reason'],
        properties: {
          index: { type: 'integer', description: 'Index of the question in the draft.' },
          verdict: { type: 'string', enum: ['kept', 'fixed', 'dropped'] },
          reason: { type: 'string' },
        },
      },
    },
  },
})

const sentences = (s: string) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean).length

export const Correction = z.object({ quote: z.string().min(1), problem: z.string().min(1), correction: z.string().min(1) })

export const Question = z
  .object({
    type: z.enum(['sba', 'short']),
    frequency: z.enum(FREQUENCIES),
    level: z.enum(LEVELS),
    stem: z.string().trim().min(8),
    options: z.array(z.string()),
    answer: z.number().int(),
    answerText: z.string(),
    why: z.string().trim().min(20),
    whyNot: z.array(z.string()),
    tip: z.string().trim().min(15),
    bone: z.string(),
    notesQuote: z.string(),
  })
  .superRefine((q, ctx) => {
    const n = sentences(q.why)
    if (n < 1 || n > 5) ctx.addIssue({ code: 'custom', message: `why has ${n} sentences` })
    if (q.type === 'sba') {
      if (q.options.length !== 4 || q.options.some((o) => !o.trim())) ctx.addIssue({ code: 'custom', message: 'sba needs four non-empty options' })
      if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) ctx.addIssue({ code: 'custom', message: 'duplicate options' })
      if (q.answer < 0 || q.answer > 3) ctx.addIssue({ code: 'custom', message: 'answer out of range' })
      if (q.whyNot.length !== 4) ctx.addIssue({ code: 'custom', message: 'whyNot needs four lines' })
      else
        q.whyNot.forEach((w, k) => {
          if (k === q.answer ? w.trim() !== '' : w.trim().length < 10) ctx.addIssue({ code: 'custom', message: `whyNot[${k}] wrong` })
        })
    } else if (q.answerText.trim().length < 20) ctx.addIssue({ code: 'custom', message: 'short answer needs a model answer' })
  })
export type Question = z.infer<typeof Question>

export const AuthorResult = z.object({
  status: z.enum(STATUSES),
  message: z.string(),
  transcript: z.string(),
  title: z.string(),
  corrections: z.array(z.unknown()),
  questions: z.array(z.unknown()),
})

export const ExaminerResult = z.object({
  corrections: z.array(z.unknown()),
  questions: z.array(z.unknown()),
  review: z.array(z.object({ index: z.number().int(), verdict: z.enum(['kept', 'fixed', 'dropped']), reason: z.string() })),
})

/** Keep only the items that pass; report how many were dropped. Unknown bone ids are cleared, not fatal. */
export function keepValid(questions: unknown[], boneIds: Set<string>): { questions: Question[]; dropped: number } {
  const out: Question[] = []
  for (const raw of questions) {
    const r = Question.safeParse(raw)
    if (!r.success) continue
    const q = r.data
    out.push({
      ...q,
      bone: boneIds.has(q.bone) ? q.bone : '',
      options: q.type === 'sba' ? q.options.map((o) => o.trim()) : [],
      whyNot: q.type === 'sba' ? q.whyNot.map((w) => w.trim()) : [],
      answer: q.type === 'sba' ? q.answer : -1,
      answerText: q.type === 'short' ? q.answerText.trim() : '',
    })
  }
  return { questions: out, dropped: questions.length - out.length }
}

export const keepCorrections = (items: unknown[]) => items.flatMap((c) => {
  const r = Correction.safeParse(c)
  return r.success ? [r.data] : []
})
