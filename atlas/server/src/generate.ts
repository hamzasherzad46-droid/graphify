import { authorJsonSchema, cardsExaminerJsonSchema, cardsJsonSchema, examinerJsonSchema, keepCards, keepConflicts, keepCorrections, keepValid, Review, type Card, type Conflict, type Correction, type Question } from './schema.ts'
import { authorPrompt, examinerPrompt, settingsText, type BoneRef, type Settings } from './prompts.ts'
import { PipelineError, type Caller } from './pipeline.ts'

/**
 * Notes to Exam, generation. The student's chosen material arrives as parts (a page, slide or section, each with its
 * reference and topic). It is planned into chunks by topic, and each chunk goes through two examiners: the first
 * drafts, the second checks every draft against anatomical fact and the standards, fixing or dropping what is not
 * sound. Each checked batch is sent to the app as soon as it is ready, so the first questions appear while the rest
 * are still being written. Chunks run three at a time, first chunk first; the first is kept small (at most five
 * questions) and written at lower effort, so it arrives quickly.
 */

export interface Part {
  ref: string
  topic: string
  text: string
}

export interface Chunk {
  topic: string
  parts: Part[]
  count: number
}

export interface Batch {
  topic: string
  questions: Question[]
  cards: Card[]
  corrections: Correction[]
  conflicts: Conflict[]
  review: { kept: number; fixed: number; dropped: number }
}

/** Longest stretch of material in one chunk (characters). */
export const CHUNK_CHARS = 12000
/** The first batch is kept to this many questions, so it arrives quickly. */
export const FIRST_BATCH = 5
const PARALLEL = 3

/**
 * Plan the chunks: parts grouped by topic, in order; a long topic split at part boundaries; the questions shared out
 * by length (largest remainder), every chunk getting at least one while there are enough. The first chunk is split
 * if it would need more than FIRST_BATCH questions.
 */
export function planChunks(parts: Part[], count: number): Chunk[] {
  const groups: { topic: string; parts: Part[] }[] = []
  for (const p of parts) {
    const g = groups.at(-1)
    const size = g ? g.parts.reduce((n, x) => n + x.text.length, 0) : 0
    if (g && g.topic === p.topic && size + p.text.length <= CHUNK_CHARS) g.parts.push(p)
    else groups.push({ topic: p.topic, parts: [p] })
  }
  const len = groups.map((g) => g.parts.reduce((n, x) => n + x.text.length, 0) || 1)
  const total = len.reduce((a, b) => a + b, 0)
  // Too few questions for every chunk: the longest chunks get one each (kept in reading order).
  if (count < groups.length) {
    const keep = new Set(
      len
        .map((l, k) => [l, k] as const)
        .sort((a, b) => b[0] - a[0])
        .slice(0, count)
        .map(([, k]) => k),
    )
    return groups.filter((_, k) => keep.has(k)).map((g) => ({ ...g, count: 1 }))
  }
  const exact = len.map((l) => (count * l) / total)
  const counts = exact.map((x) => Math.max(1, Math.floor(x)))
  let left = count - counts.reduce((a, b) => a + b, 0)
  const order = exact.map((x, k) => [x - Math.floor(x), k] as const).sort((a, b) => b[0] - a[0])
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) counts[order[i][1]]++
  for (let k = counts.length - 1; left < 0 && k >= 0; k--)
    while (counts[k] > 1 && left < 0) {
      counts[k]--
      left++
    }
  const chunks = groups.map((g, k) => ({ ...g, count: counts[k] }))
  // The first chunk: at most FIRST_BATCH questions; the rest of its share becomes a second chunk on the same parts.
  if (chunks[0].count > FIRST_BATCH) {
    const rest = chunks[0].count - FIRST_BATCH
    chunks.splice(0, 1, { ...chunks[0], count: FIRST_BATCH }, { ...chunks[0], count: rest })
  }
  return chunks
}

const material = (parts: Part[]) => parts.map((p) => `<part ref="${p.ref.replace(/"/g, '”')}" topic="${p.topic.replace(/"/g, '”')}">\n${p.text}\n</part>`).join('\n')

/** One chunk through both examiners. */
export async function runChunk(chunk: Chunk, settings: Settings, bones: BoneRef[], caller: Caller, opts: { first: boolean; missed?: string[] }): Promise<Batch> {
  const ids = bones.map((b) => b.id)
  const boneIds = new Set(ids)
  const refs = chunk.parts.map((p) => p.ref)
  const refSet = new Set(refs)
  const missed = settings.mode === 'weak' && opts.missed?.length ? `\n\nMissed before:\n${opts.missed.map((m) => `- ${m}`).join('\n')}` : ''
  const ask = `The student's material, in order:\n${material(chunk.parts)}${missed}\n\n${settingsText(settings, chunk.count)}`
  // Speed where it matters: the first batch, and quick quizzes, at lower effort; mock exams at full effort.
  const effort = settings.mode === 'mock' ? 'high' : opts.first ? 'low' : 'medium'
  const checkEffort = settings.mode === 'mock' ? 'high' : 'medium'
  const counts = (review: { verdict: string }[], extraDropped: number) => ({
    kept: review.filter((r) => r.verdict === 'kept').length,
    fixed: review.filter((r) => r.verdict === 'fixed').length,
    dropped: review.filter((r) => r.verdict === 'dropped').length + extraDropped,
  })

  if (settings.mode === 'flashcards') {
    const draft = (await caller.json(authorPrompt(bones, 'flashcards'), [{ type: 'text', text: ask }], cardsJsonSchema(refs), { effort })) as { cards?: unknown[]; corrections?: unknown[] } | null
    if (!draft || !Array.isArray(draft.cards)) throw new PipelineError('bad_output', 'Something went wrong while writing the flashcards. Please try again.')
    const drafted = keepCards(draft.cards, refSet)
    if (!drafted.cards.length) throw new PipelineError('bad_output', 'No flashcards could be written from this part of the material.')
    const checked = (await caller.json(
      examinerPrompt(bones, 'flashcards'),
      [{ type: 'text', text: `${ask}\n\nCorrections noted:\n${JSON.stringify(keepCorrections(draft.corrections ?? [], refSet), null, 1)}\n\nDraft cards (by index):\n${JSON.stringify(drafted.cards.map((c, index) => ({ index, ...c })), null, 1)}` }],
      cardsExaminerJsonSchema(refs),
      { effort: checkEffort },
    )) as { cards?: unknown[]; corrections?: unknown[]; review?: unknown } | null
    const review = Review.safeParse(checked?.review)
    if (!checked || !Array.isArray(checked.cards) || !review.success) throw new PipelineError('bad_output', 'Something went wrong while checking the flashcards. Please try again.')
    const final = keepCards(checked.cards, refSet)
    return { topic: chunk.topic, questions: [], cards: final.cards, corrections: keepCorrections(checked.corrections ?? [], refSet), conflicts: [], review: counts(review.data, drafted.dropped + final.dropped) }
  }

  const draft = (await caller.json(authorPrompt(bones, settings.mode), [{ type: 'text', text: ask }], authorJsonSchema(ids, refs), { effort })) as {
    questions?: unknown[]
    corrections?: unknown[]
    conflicts?: unknown[]
  } | null
  if (!draft || !Array.isArray(draft.questions)) throw new PipelineError('bad_output', 'Something went wrong while writing the questions. Please try again.')
  const drafted = keepValid(draft.questions, boneIds, refSet)
  if (!drafted.questions.length) throw new PipelineError('bad_output', 'No questions could be written from this part of the material.')
  const checked = (await caller.json(
    examinerPrompt(bones, settings.mode),
    [
      {
        type: 'text',
        text: `${ask}\n\nCorrections noted by the first examiner:\n${JSON.stringify(keepCorrections(draft.corrections ?? [], refSet), null, 1)}\n\nConflicts noted:\n${JSON.stringify(keepConflicts(draft.conflicts ?? [], refSet), null, 1)}\n\nDraft questions (by index):\n${JSON.stringify(
          drafted.questions.map((q, index) => ({ index, ...q })),
          null,
          1,
        )}`,
      },
    ],
    examinerJsonSchema(ids, refs),
    { effort: checkEffort },
  )) as { questions?: unknown[]; corrections?: unknown[]; conflicts?: unknown[]; review?: unknown } | null
  const review = Review.safeParse(checked?.review)
  if (!checked || !Array.isArray(checked.questions) || !review.success) throw new PipelineError('bad_output', 'Something went wrong while checking the questions. Please try again.')
  const final = keepValid(checked.questions, boneIds, refSet)
  return {
    topic: chunk.topic,
    questions: final.questions,
    cards: [],
    corrections: keepCorrections(checked.corrections ?? [], refSet),
    conflicts: keepConflicts(checked.conflicts ?? [], refSet),
    review: counts(review.data, drafted.dropped + final.dropped),
  }
}

export interface Events {
  /** Progress: chunks finished, of how many. */
  progress(done: number, total: number): void
  batch(b: Batch): void
  /** A chunk that failed; the others carry on. */
  chunkError(topic: string, message: string): void
}

/**
 * Generate a whole set: plan the chunks, run them (first chunk first, then three at a time) and report each batch as
 * it is ready. Rejects only when every chunk failed, or nothing usable came back.
 */
export async function generate(parts: Part[], settings: Settings, bones: BoneRef[], caller: Caller, on: Events, missed?: string[]): Promise<{ batches: number; items: number }> {
  const chunks = planChunks(parts, settings.count)
  let next = 0
  let done = 0
  let items = 0
  let failures = 0
  let lastError: unknown = null
  on.progress(0, chunks.length)
  const worker = async () => {
    while (next < chunks.length) {
      const k = next++
      try {
        const b = await runChunk(chunks[k], settings, bones, caller, { first: k === 0, missed })
        items += b.questions.length + b.cards.length
        if (b.questions.length || b.cards.length || b.corrections.length || b.conflicts.length) on.batch(b)
      } catch (e) {
        failures++
        lastError = e
        on.chunkError(chunks[k].topic, e instanceof PipelineError ? e.message : 'Something went wrong with this part.')
        if (!(e instanceof PipelineError)) console.error(e)
      }
      on.progress(++done, chunks.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker))
  if (failures === chunks.length) throw lastError instanceof PipelineError ? lastError : new PipelineError('api', 'The questions could not be written. Please try again.')
  if (!items) throw new PipelineError('bad_output', 'Nothing passed the examiner’s check. Try choosing more of your material.')
  return { batches: chunks.length - failures, items }
}
