import { z } from 'zod'

/**
 * What the model must return, twice over: a JSON schema the API enforces (structured outputs), and zod checks in code
 * for the rules a JSON schema cannot express (exactly four distinct options, the blank "why not" line under the
 * answer, one blank in a fill-in question, a reference the notes really contain …). Anything that fails is dropped,
 * never shown.
 */

export const LEVELS = ['foundation', 'undergraduate', 'medical'] as const
export const FREQUENCIES = ['core', 'common', 'advanced'] as const
export const TYPES = ['sba', 'short', 'tf', 'cloze'] as const
export type QType = (typeof TYPES)[number]
export const BLANK = '_____'

const question = (boneIds: string[], refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['type', 'frequency', 'level', 'stem', 'options', 'answer', 'answerText', 'points', 'accept', 'why', 'whyNot', 'tip', 'bone', 'notesQuote', 'ref'],
  properties: {
    type: { type: 'string', enum: [...TYPES], description: 'sba: single best answer (four options). short: short answer. tf: true or false. cloze: fill in the blank.' },
    frequency: { type: 'string', enum: [...FREQUENCIES] },
    level: { type: 'string', enum: [...LEVELS] },
    stem: { type: 'string', description: `The question. tf: a single statement to judge. cloze: a sentence with exactly one blank written ${BLANK}.` },
    options: { type: 'array', items: { type: 'string' }, description: 'sba: exactly four options. tf: ["True", "False"]. short and cloze: empty.' },
    answer: { type: 'integer', description: 'sba: index (0-3) of the single best answer. tf: 0 for True, 1 for False. short and cloze: -1.' },
    answerText: { type: 'string', description: 'cloze: the missing word or words. short: the model answer in one or two sentences. sba and tf: empty.' },
    points: { type: 'array', items: { type: 'string' }, description: 'short: the marking points, two to six, one fact each. Others: empty.' },
    accept: { type: 'array', items: { type: 'string' }, description: 'cloze: other answers that are equally correct (synonyms, accepted older names). Others: empty.' },
    why: { type: 'string', description: 'Why this is the answer: two to four sentences.' },
    whyNot: { type: 'array', items: { type: 'string' }, description: 'sba: one line per option, in option order, empty string for the answer. Others: empty.' },
    tip: { type: 'string', description: 'The exam tip: the trap examiners set on this point.' },
    bone: { type: 'string', enum: ['', ...boneIds], description: 'The Atlas bone ID most relevant to the question, or empty.' },
    notesQuote: { type: 'string', description: 'The words of the notes this question tests, quoted exactly.' },
    ref: { type: 'string', enum: refs, description: 'Where in the notes those words are: the part’s reference, exactly as given.' },
  },
})

const correction = (refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['quote', 'ref', 'problem', 'correction'],
  properties: { quote: { type: 'string' }, ref: { type: 'string', enum: refs }, problem: { type: 'string' }, correction: { type: 'string' } },
})

const conflict = (refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['quoteA', 'refA', 'quoteB', 'refB', 'note'],
  properties: {
    quoteA: { type: 'string' },
    refA: { type: 'string', enum: refs },
    quoteB: { type: 'string' },
    refB: { type: 'string', enum: refs },
    note: { type: 'string', description: 'One sentence: how the two parts disagree, and which (if either) is right.' },
  },
})

const card = (refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['front', 'back', 'ref', 'notesQuote'],
  properties: { front: { type: 'string' }, back: { type: 'string' }, ref: { type: 'string', enum: refs }, notesQuote: { type: 'string' } },
})

const review = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['index', 'verdict', 'reason'],
    properties: { index: { type: 'integer' }, verdict: { type: 'string', enum: ['kept', 'fixed', 'dropped'] }, reason: { type: 'string' } },
  },
}

/** First examiner, questions: corrections, contradictions within the notes, and the drafts. */
export const authorJsonSchema = (boneIds: string[], refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['corrections', 'conflicts', 'questions'],
  properties: { corrections: { type: 'array', items: correction(refs) }, conflicts: { type: 'array', items: conflict(refs) }, questions: { type: 'array', items: question(boneIds, refs) } },
})

/** Second examiner, questions: the checked set, with a verdict on each draft. */
export const examinerJsonSchema = (boneIds: string[], refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['corrections', 'conflicts', 'questions', 'review'],
  properties: { ...authorJsonSchema(boneIds, refs).properties, review },
})

/** Flashcards: first and second examiner. */
export const cardsJsonSchema = (refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['corrections', 'cards'],
  properties: { corrections: { type: 'array', items: correction(refs) }, cards: { type: 'array', items: card(refs) } },
})
export const cardsExaminerJsonSchema = (refs: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['corrections', 'cards', 'review'],
  properties: { ...cardsJsonSchema(refs).properties, review },
})

const sentences = (s: string) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean).length
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export const Question = z
  .object({
    type: z.enum(TYPES),
    frequency: z.enum(FREQUENCIES),
    level: z.enum(LEVELS),
    stem: z.string().trim().min(8),
    options: z.array(z.string()),
    answer: z.number().int(),
    answerText: z.string(),
    points: z.array(z.string()),
    accept: z.array(z.string()),
    why: z.string().trim().min(20),
    whyNot: z.array(z.string()),
    tip: z.string().trim().min(15),
    bone: z.string(),
    notesQuote: z.string(),
    ref: z.string(),
  })
  .superRefine((q, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: 'custom', message })
    const n = sentences(q.why)
    if (n < 1 || n > 5) bad(`why has ${n} sentences`)
    if (q.type === 'sba') {
      if (q.options.length !== 4 || q.options.some((o) => !o.trim())) bad('sba needs four non-empty options')
      if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) bad('duplicate options')
      if (q.answer < 0 || q.answer > 3) bad('answer out of range')
      if (q.whyNot.length !== 4) bad('whyNot needs four lines')
      else q.whyNot.forEach((w, k) => (k === q.answer ? w.trim() !== '' : w.trim().length < 10) && bad(`whyNot[${k}] wrong`))
    } else if (q.type === 'tf') {
      if (q.options.length !== 2 || q.options[0] !== 'True' || q.options[1] !== 'False') bad('tf options must be True, False')
      if (q.answer !== 0 && q.answer !== 1) bad('tf answer must be 0 or 1')
      if (/\?\s*$/.test(q.stem)) bad('tf stem must be a statement')
    } else if (q.type === 'cloze') {
      if (q.stem.split(BLANK).length !== 2) bad('cloze needs exactly one blank')
      if (!q.answerText.trim() || words(q.answerText) > 4) bad('cloze answer must be one to four words')
    } else {
      if (q.answerText.trim().length < 20) bad('short answer needs a model answer')
      if (q.points.filter((p) => p.trim()).length < 2 || q.points.length > 6) bad('short answer needs two to six marking points')
    }
  })
export type Question = z.infer<typeof Question>

/** Keep only the questions that pass and cite a part of the notes they were given; tidy the rest. */
export function keepValid(questions: unknown[], boneIds: Set<string>, refs: Set<string>): { questions: Question[]; dropped: number } {
  const out: Question[] = []
  for (const raw of questions) {
    const r = Question.safeParse(raw)
    if (!r.success || !refs.has(r.data.ref)) continue
    const q = r.data
    const choice = q.type === 'sba' || q.type === 'tf'
    out.push({
      ...q,
      bone: boneIds.has(q.bone) ? q.bone : '',
      options: choice ? q.options.map((o) => o.trim()) : [],
      whyNot: q.type === 'sba' ? q.whyNot.map((w) => w.trim()) : [],
      answer: choice ? q.answer : -1,
      answerText: q.type === 'short' || q.type === 'cloze' ? q.answerText.trim() : '',
      points: q.type === 'short' ? q.points.map((p) => p.trim()).filter(Boolean) : [],
      accept: q.type === 'cloze' ? q.accept.map((a) => a.trim()).filter(Boolean) : [],
    })
  }
  return { questions: out, dropped: questions.length - out.length }
}

export const Card = z.object({ front: z.string().trim().min(5), back: z.string().trim().min(1), ref: z.string(), notesQuote: z.string() })
export type Card = z.infer<typeof Card>
export const keepCards = (cards: unknown[], refs: Set<string>) => {
  const out = cards.flatMap((c) => {
    const r = Card.safeParse(c)
    return r.success && refs.has(r.data.ref) ? [{ ...r.data, front: r.data.front.trim(), back: r.data.back.trim() }] : []
  })
  return { cards: out, dropped: cards.length - out.length }
}

export const Correction = z.object({ quote: z.string().min(1), ref: z.string(), problem: z.string().min(1), correction: z.string().min(1) })
export type Correction = z.infer<typeof Correction>
export const keepCorrections = (items: unknown[], refs: Set<string>) =>
  items.flatMap((c) => {
    const r = Correction.safeParse(c)
    return r.success && refs.has(r.data.ref) ? [r.data] : []
  })

export const Conflict = z.object({ quoteA: z.string().min(1), refA: z.string(), quoteB: z.string().min(1), refB: z.string(), note: z.string().min(1) })
export type Conflict = z.infer<typeof Conflict>
export const keepConflicts = (items: unknown[], refs: Set<string>) =>
  items.flatMap((c) => {
    const r = Conflict.safeParse(c)
    return r.success && refs.has(r.data.refA) && refs.has(r.data.refB) && r.data.refA !== r.data.refB ? [r.data] : []
  })

export const Review = z.array(z.object({ index: z.number().int(), verdict: z.enum(['kept', 'fixed', 'dropped']), reason: z.string() }))
