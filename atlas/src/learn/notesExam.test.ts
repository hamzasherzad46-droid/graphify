import { afterEach, describe, expect, it, vi } from 'vitest'
import { coverage, dueQuestions, generatedQuestion, isGeneratedId, missedIn, NotesError, parseEvent, reviewKey, streamSet, toQuestions, topicCoverage, useNoteSets, type NoteSet, type ServerBatch, type ServerQuestion } from './notesExam'
import { checkCloze, isCorrect, isDone, type Question } from './questions'
import type { StoredCard } from '../state/progress'

/** Hand-written test data shaped like the server's output. Nothing here is shown to a student. */
const sq = (over: Partial<ServerQuestion> = {}): ServerQuestion => ({
  type: 'sba',
  frequency: 'core',
  level: 'undergraduate',
  stem: 'Which bone lies lateral in the forearm?',
  options: ['Ulna', 'Radius', 'Humerus', 'Scaphoid'],
  answer: 1,
  answerText: '',
  points: [],
  accept: [],
  why: 'The radius is on the thumb side. The ulna is medial.',
  whyNot: ['Medial bone.', '', 'Arm bone.', 'Carpal bone.'],
  tip: 'The radius follows the thumb.',
  bone: 'radius_left',
  notesQuote: 'radius = lateral',
  ref: 'Lecture 3.pptx, slide 2',
  ...over,
})
const parts = [
  { ref: 'Lecture 3.pptx, slide 2', partId: 'p2', topic: 'Forearm' },
  { ref: 'Lecture 3.pptx, slide 3', partId: 'p3', topic: 'Forearm' },
  { ref: 'Lecture 3.pptx, slide 9', partId: 'p9', topic: 'Hand' },
]
const settings = { mode: 'quick' as const, count: 5, level: 'foundation' as const, types: ['sba' as const] }
const setOf = (id: string, questions: Question[]): NoteSet => ({ id, title: 'Forearm', createdAt: '2026-11-23T10:00:00Z', settings, from: { files: ['Lecture 3.pptx'] }, parts, corrections: [], questions, review: { kept: questions.length, fixed: 0, dropped: 0 }, status: 'done' })

describe('Notes to Exam: questions', () => {
  it('turns server questions into Atlas questions, marked as AI-written, linked to their part', () => {
    const [a, b, c, d] = toQuestions(
      'abc',
      [
        sq(),
        sq({ type: 'short', options: [], answer: -1, whyNot: [], answerText: 'Radius: lateral.', points: ['Radius is lateral'], notesQuote: '  ', ref: '' }),
        sq({ type: 'tf', options: ['True', 'False'], answer: 0, whyNot: [] }),
        sq({ type: 'cloze', options: [], answer: -1, whyNot: [], stem: 'The _____ lies lateral.', answerText: 'radius', accept: ['radial bone'] }),
      ],
      { start: 4, section: 'Forearm', parts },
    )
    expect(a).toMatchObject({ id: 'ne-abc-5', type: 'sba', answer: 1, reviewStatus: 'ai', source: { kind: 'ai' }, notesQuote: 'radius = lateral', ref: 'Lecture 3.pptx, slide 2', refPart: 'p2', section: 'Forearm' })
    expect(a.source.ref).toMatch(/Not reviewed by an academic/)
    // A short answer has no options; its marking points travel with it; an empty quote or ref is left out.
    expect(b).toMatchObject({ id: 'ne-abc-6', type: 'short', answerText: 'Radius: lateral.', points: ['Radius is lateral'] })
    expect(b.options).toBeUndefined()
    expect(b.notesQuote).toBeUndefined()
    expect(b.ref).toBeUndefined()
    // True or false keeps its two options but has no per-option notes.
    expect(c).toMatchObject({ type: 'tf', options: ['True', 'False'], answer: 0 })
    expect(c.whyNot).toBeUndefined()
    expect(d).toMatchObject({ type: 'cloze', answerText: 'radius', accept: ['radial bone'] })
    expect(isGeneratedId(a.id)).toBe(true)
    expect(isGeneratedId('skull-01')).toBe(false)
  })

  it('finds a generated question in the saved sets', () => {
    useNoteSets.setState({ sets: { s1: setOf('s1', toQuestions('s1', [sq(), sq()])) } })
    expect(generatedQuestion('ne-s1-2')).toMatchObject({ n: 2, set: { title: 'Forearm' } })
    expect(generatedQuestion('ne-s1-9')).toBeUndefined()
    expect(generatedQuestion('skull-01')).toBeUndefined()
  })
})

describe('Notes to Exam: answers', () => {
  const cloze = toQuestions('c', [sq({ type: 'cloze', options: [], answer: -1, whyNot: [], answerText: 'Scaphoid', accept: ['navicular'] })])[0]
  const short = toQuestions('c', [sq({ type: 'short', options: [], answer: -1, whyNot: [], answerText: 'x', points: ['a', 'b', 'c'] })])[0]
  const at = '2026-11-25T09:00:00Z'

  it('marks a fill-in answer: exact, accepted, one slip in a longer word, or wrong', () => {
    expect(checkCloze(cloze, '  the Scaphoid ')).toBe('correct')
    expect(checkCloze(cloze, 'Navicular')).toBe('correct')
    expect(checkCloze(cloze, 'scaphiod')).toBe('close') // two letters swapped counts as one slip
    expect(checkCloze(cloze, 'scapula')).toBe('wrong')
    expect(checkCloze(cloze, 'scaphod')).toBe('close')
    expect(checkCloze(cloze, 'lunate')).toBe('wrong')
    expect(checkCloze(cloze, '')).toBe('wrong')
  })

  it('counts a short answer right at 60% of its points, or by the student’s own verdict', () => {
    const mark = (score: number) => ({ text: 'y', mark: { score, max: 3, points: [], tip: '' }, at })
    expect(isCorrect(short, mark(2))).toBe(true)
    expect(isCorrect(short, mark(1))).toBe(false)
    expect(isCorrect(short, { self: 'knew', at })).toBe(true)
    expect(isDone(short, { text: 'written, not yet marked', at })).toBe(false)
    expect(isDone(cloze, { text: 'scaphoid', at })).toBe(true)
  })
})

describe('Notes to Exam: coverage, gaps and review', () => {
  const qs = toQuestions('s2', [sq(), sq({ ref: 'Lecture 3.pptx, slide 2', stem: 'Which bone is medial?', answer: 0 }), sq({ ref: 'Lecture 3.pptx, slide 9', stem: 'Which carpal bone is most often fractured?' })], { parts })
  const set = setOf('s2', qs)
  const at = '2026-11-25T09:00:00Z'
  const answers = { [qs[0].id]: { choice: 1, at }, [qs[2].id]: { choice: 0, at } }

  it('counts questions, answers and right answers for every part sent', () => {
    expect(coverage(set, answers)).toEqual([
      { ...parts[0], questions: 2, answered: 1, correct: 1 },
      { ...parts[1], questions: 0, answered: 0, correct: 0 },
      { ...parts[2], questions: 1, answered: 1, correct: 0 },
    ])
  })

  it('lists the gaps (parts with no question) and accuracy by topic', () => {
    const [forearm, hand] = topicCoverage(set, answers)
    expect(forearm).toMatchObject({ topic: 'Forearm', parts: 2, tested: 1, answered: 1, correct: 1, accuracy: 1 })
    expect(forearm.gaps.map((g) => g.ref)).toEqual(['Lecture 3.pptx, slide 3'])
    expect(hand).toMatchObject({ topic: 'Hand', tested: 1, accuracy: 0 })
  })

  it('collects what was missed, for a weak-spots set', () => {
    expect(missedIn(set, answers)).toEqual({ stems: ['Which carpal bone is most often fractured?'], refs: ['Lecture 3.pptx, slide 9'] })
  })

  it('finds generated questions due for review, earliest first', () => {
    const card = (due: string) => ({ due, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 2 }) as StoredCard
    const cards = { [reviewKey(qs[1].id)]: card('2026-11-24T08:00:00Z'), [reviewKey(qs[0].id)]: card('2026-11-20T08:00:00Z'), [reviewKey(qs[2].id)]: card('2026-12-01T08:00:00Z') }
    const due = dueQuestions({ s2: set }, cards, new Date(at))
    expect(due.map((d) => d.q.id)).toEqual([qs[0].id, qs[1].id])
  })
})

describe('Notes to Exam: server events', () => {
  afterEach(() => vi.unstubAllGlobals())
  const handlers = () => {
    const seen: string[] = []
    return { seen, on: { progress: (d: number, t: number) => seen.push(`progress ${d}/${t}`), batch: (b: ServerBatch) => seen.push(`batch ${b.topic} ${b.questions.length}`), chunkError: (t: string, m: string) => seen.push(`error ${t}: ${m}`) } }
  }
  const body = { parts: [{ ref: 'p1', topic: 'Forearm', text: 'radius = lateral' }], ...settings }

  it('parses event blocks and ignores pings', () => {
    expect(parseEvent('event: progress\ndata: {"done":0,"total":2}')).toEqual({ event: 'progress', data: { done: 0, total: 2 } })
    expect(parseEvent(': ping')).toBeNull()
    expect(parseEvent('event: batch\ndata: not json')).toBeNull()
  })

  /** A response whose body arrives in the given pieces (split anywhere, as a network does). */
  const streamed = (pieces: string[], status = 200) =>
    new Response(
      new ReadableStream({
        start(c) {
          for (const p of pieces) c.enqueue(new TextEncoder().encode(p))
          c.close()
        },
      }),
      { status, headers: { 'Content-Type': 'text/event-stream' } },
    )
  const batch: ServerBatch = { topic: 'Forearm', questions: [sq()], cards: [], corrections: [], conflicts: [], review: { kept: 1, fixed: 0, dropped: 0 } }

  it('passes on each batch as it arrives, however the stream is split', async () => {
    const text = `event: progress\ndata: {"done":0,"total":2}\n\n: ping\n\nevent: batch\ndata: ${JSON.stringify(batch)}\n\nevent: chunkError\ndata: {"topic":"Hand","message":"Not written."}\n\nevent: progress\ndata: {"done":2,"total":2}\n\nevent: done\ndata: {"batches":1,"items":1}\n\n`
    const fetchMock = vi.fn(async () => streamed(text.match(/[\s\S]{1,7}/g)!))
    vi.stubGlobal('fetch', fetchMock)
    const h = handlers()
    expect(await streamSet(body, h.on)).toEqual({ batches: 1, items: 1 })
    expect(h.seen).toEqual(['progress 0/2', 'batch Forearm 1', 'error Hand: Not written.', 'progress 2/2'])
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/notes-to-exam')
    expect(JSON.parse(String(init.body))).toMatchObject({ mode: 'quick', count: 5, types: ['sba'], parts: [{ ref: 'p1' }] })
    expect((init.headers as Record<string, string>)['X-Atlas-Client']).toBeTruthy()
  })

  it('passes on the server’s own message for errors', async () => {
    vi.stubGlobal('fetch', async () => streamed(['event: progress\ndata: {"done":0,"total":1}\n\n', 'event: error\ndata: {"message":"These notes could not be turned into questions."}\n\n']))
    await expect(streamSet(body, handlers().on)).rejects.toThrow('These notes could not be turned into questions.')
    vi.stubGlobal('fetch', async () => Response.json({ error: 'You have made a lot of question sets this hour. Please try again in 12 minutes.' }, { status: 429 }))
    await expect(streamSet(body, handlers().on)).rejects.toThrow(/12 minutes/)
  })

  it('explains a lost connection or an unreachable service', async () => {
    vi.stubGlobal('fetch', async () => streamed(['event: progress\ndata: {"done":0,"total":1}\n\n']))
    await expect(streamSet(body, handlers().on)).rejects.toThrow(/connection was lost/)
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    const e = await streamSet(body, handlers().on).catch((x) => x)
    expect(e).toBeInstanceOf(NotesError)
    expect(e.message).toMatch(/could not reach/)
  })
})
