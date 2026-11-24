import Anthropic from '@anthropic-ai/sdk'
import { authorJsonSchema, AuthorResult, examinerJsonSchema, ExaminerResult, keepCorrections, keepValid, type Question } from './schema.ts'
import { authorPrompt, examinerPrompt, settingsText, type BoneRef, type Settings } from './prompts.ts'

/** The notes as sent by the app: page photos (JPEG/PNG/WebP), a PDF, and/or typed text. */
export interface Notes {
  images: { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }[]
  pdf?: string
  text?: string
}

export interface Result {
  status: 'ok' | 'unreadable' | 'not_anatomy'
  message: string
  title: string
  transcript: string
  corrections: { quote: string; problem: string; correction: string }[]
  questions: Question[]
  /** What the second examiner did: kept, fixed and dropped counts (dropped includes any that failed validation). */
  review: { kept: number; fixed: number; dropped: number }
}

export class PipelineError extends Error {
  readonly kind: 'refused' | 'too_long' | 'bad_output' | 'api'
  constructor(kind: PipelineError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export const MODEL = 'claude-opus-5-5'
const MAX_TOKENS = 64000

/** The two calls the pipeline makes; replaced by a fake in tests. */
export interface Caller {
  json(system: string, content: Anthropic.Beta.BetaContentBlockParam[], schema: Record<string, unknown>): Promise<unknown>
}

/**
 * One structured call to Claude: streamed (long outputs), effort high (quality matters more than speed here),
 * adaptive thinking (the default on this model), the output held to `schema` by structured outputs, and server-side
 * fallbacks so a request declined by a safety classifier is retried on a suitable model instead of failing.
 */
export function claudeCaller(client: Anthropic): Caller {
  return {
    async json(system, content, schema) {
      let message: Anthropic.Beta.BetaMessage
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: 'high', format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content }],
        })
        message = await stream.finalMessage()
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) throw new PipelineError('api', 'Atlas is busy. Please try again in a minute.')
        if (e instanceof Anthropic.BadRequestError) throw new PipelineError('api', 'The notes could not be sent. Try fewer or smaller pages.')
        if (e instanceof Anthropic.APIError) throw new PipelineError('api', 'The question service is not available just now. Please try again.')
        throw e
      }
      if (message.stop_reason === 'refusal') throw new PipelineError('refused', 'These notes could not be turned into questions.')
      if (message.stop_reason === 'max_tokens') throw new PipelineError('too_long', 'The notes are too long for one set. Try fewer pages.')
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      try {
        return JSON.parse(text)
      } catch {
        throw new PipelineError('bad_output', 'Something went wrong while writing the questions. Please try again.')
      }
    },
  }
}

function notesContent(notes: Notes): Anthropic.Beta.BetaContentBlockParam[] {
  const out: Anthropic.Beta.BetaContentBlockParam[] = []
  notes.images.forEach((img, k) => {
    out.push({ type: 'text', text: `Page ${k + 1}:` })
    out.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } })
  })
  if (notes.pdf) out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: notes.pdf } })
  if (notes.text?.trim()) out.push({ type: 'text', text: `Typed notes:\n<notes>\n${notes.text.trim()}\n</notes>` })
  return out
}

/**
 * Notes to exam questions, in two passes. The first examiner reads the notes and drafts the set; the second checks
 * every draft question against anatomical fact and the question standards, fixing or dropping what is not sound.
 * Both outputs are validated again here; anything that fails is dropped.
 */
export async function notesToExam(notes: Notes, settings: Settings, bones: BoneRef[], caller: Caller, onStage: (stage: 'reading' | 'checking') => void = () => {}): Promise<Result> {
  const ids = bones.map((b) => b.id)
  const boneIds = new Set(ids)

  onStage('reading')
  const draftRaw = AuthorResult.safeParse(await caller.json(authorPrompt(bones), [...notesContent(notes), { type: 'text', text: settingsText(settings) }], authorJsonSchema(ids)))
  if (!draftRaw.success) throw new PipelineError('bad_output', 'Something went wrong while reading the notes. Please try again.')
  const draft = draftRaw.data
  if (draft.status !== 'ok') return { status: draft.status, message: draft.message, title: '', transcript: draft.transcript, corrections: [], questions: [], review: { kept: 0, fixed: 0, dropped: 0 } }
  const drafted = keepValid(draft.questions, boneIds)
  if (!drafted.questions.length) throw new PipelineError('bad_output', 'No questions could be written from these notes. Try clearer or longer notes.')

  onStage('checking')
  const checkRaw = ExaminerResult.safeParse(
    await caller.json(
      examinerPrompt(bones),
      [
        {
          type: 'text',
          text: `Transcript of the student's notes:\n<transcript>\n${draft.transcript}\n</transcript>\n\nCorrections noted by the first examiner:\n${JSON.stringify(keepCorrections(draft.corrections), null, 1)}\n\nDraft questions (by index):\n${JSON.stringify(
            drafted.questions.map((q, index) => ({ index, ...q })),
            null,
            1,
          )}\n\n${settingsText(settings)}`,
        },
      ],
      examinerJsonSchema(ids),
    ),
  )
  if (!checkRaw.success) throw new PipelineError('bad_output', 'Something went wrong while checking the questions. Please try again.')
  const checked = keepValid(checkRaw.data.questions, boneIds)
  const count = (v: string) => checkRaw.data.review.filter((r) => r.verdict === v).length
  if (!checked.questions.length) throw new PipelineError('bad_output', 'None of the questions passed the examiner’s check. Try clearer or longer notes.')

  return {
    status: 'ok',
    message: '',
    title: draft.title.trim() || 'Questions from your notes',
    transcript: draft.transcript,
    corrections: keepCorrections(checkRaw.data.corrections),
    questions: checked.questions,
    review: { kept: count('kept'), fixed: count('fixed'), dropped: count('dropped') + drafted.dropped + checked.dropped },
  }
}
