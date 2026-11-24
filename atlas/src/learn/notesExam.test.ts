import { afterEach, describe, expect, it, vi } from 'vitest'
import { generatedQuestion, isGeneratedId, NotesError, parseEvent, requestSet, toQuestions, useNoteSets, type ServerQuestion, type ServerResult } from './notesExam'

/** Hand-written test data shaped like the server's output. Nothing here is shown to a student. */
const sq = (over: Partial<ServerQuestion> = {}): ServerQuestion => ({
  type: 'sba',
  frequency: 'core',
  level: 'undergraduate',
  stem: 'Which bone lies lateral in the forearm?',
  options: ['Ulna', 'Radius', 'Humerus', 'Scaphoid'],
  answer: 1,
  answerText: '',
  why: 'The radius is on the thumb side. The ulna is medial.',
  whyNot: ['Medial bone.', '', 'Arm bone.', 'Carpal bone.'],
  tip: 'The radius follows the thumb.',
  bone: 'radius_left',
  notesQuote: 'radius = lateral',
  ...over,
})
const result: ServerResult = { status: 'ok', message: '', title: 'Forearm', transcript: 'radius = lateral', corrections: [], questions: [sq()], review: { kept: 1, fixed: 0, dropped: 0 } }

describe('Notes to Exam: questions', () => {
  it('turns server questions into Atlas questions, marked as AI-written', () => {
    const [a, b] = toQuestions('abc', [sq(), sq({ type: 'short', options: [], answer: -1, whyNot: [], answerText: 'Radius: lateral.', notesQuote: '  ' })])
    expect(a).toMatchObject({ id: 'ne-abc-1', type: 'sba', options: ['Ulna', 'Radius', 'Humerus', 'Scaphoid'], answer: 1, reviewStatus: 'ai', source: { kind: 'ai' }, notesQuote: 'radius = lateral' })
    expect(a.source.ref).toMatch(/Not reviewed by an academic/)
    // A short answer has no options to show; an empty quote is left out.
    expect(b).toMatchObject({ id: 'ne-abc-2', type: 'short', answerText: 'Radius: lateral.' })
    expect(b.options).toBeUndefined()
    expect(b.answer).toBeUndefined()
    expect(b.notesQuote).toBeUndefined()
    expect(isGeneratedId(a.id)).toBe(true)
    expect(isGeneratedId('skull-01')).toBe(false)
  })
  it('finds a generated question in the saved sets', () => {
    const questions = toQuestions('s1', [sq(), sq()])
    useNoteSets.setState({
      sets: { s1: { id: 's1', title: 'Forearm', createdAt: '2026-11-23T10:00:00Z', settings: { count: 5, level: 'foundation', mix: 'sba' }, from: { pages: 2, pdf: false, typed: false }, transcript: '', corrections: [], questions, review: { kept: 2, fixed: 0, dropped: 0 } } },
    })
    expect(generatedQuestion('ne-s1-2')).toMatchObject({ n: 2, set: { title: 'Forearm' } })
    expect(generatedQuestion('ne-s1-9')).toBeUndefined()
    expect(generatedQuestion('skull-01')).toBeUndefined()
  })
})

describe('Notes to Exam: server events', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('parses event blocks and ignores pings', () => {
    expect(parseEvent('event: stage\ndata: {"stage":"reading"}')).toEqual({ event: 'stage', data: { stage: 'reading' } })
    expect(parseEvent(': ping')).toBeNull()
    expect(parseEvent('event: result\ndata: not json')).toBeNull()
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

  it('reports each stage and returns the result, however the stream is split', async () => {
    const body = `event: stage\ndata: {"stage":"reading"}\n\n: ping\n\nevent: stage\ndata: {"stage":"checking"}\n\nevent: result\ndata: ${JSON.stringify(result)}\n\n`
    const pieces = body.match(/[\s\S]{1,7}/g)!
    const fetchMock = vi.fn(async () => streamed(pieces))
    vi.stubGlobal('fetch', fetchMock)
    const stages: string[] = []
    const r = await requestSet({ images: [], text: 'radius = lateral' }, { count: 5, level: 'foundation', mix: 'sba' }, (s) => stages.push(s))
    expect(stages).toEqual(['sending', 'reading', 'checking'])
    expect(r).toEqual(result)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/notes-to-exam')
    expect(JSON.parse(String(init.body))).toMatchObject({ text: 'radius = lateral', count: 5, level: 'foundation', mix: 'sba' })
    expect((init.headers as Record<string, string>)['X-Atlas-Client']).toBeTruthy()
  })

  it('passes on the server’s own message for errors', async () => {
    vi.stubGlobal('fetch', async () => streamed(['event: stage\ndata: {"stage":"reading"}\n\n', 'event: error\ndata: {"message":"These notes could not be turned into questions."}\n\n']))
    await expect(requestSet({ images: [], text: 'x' }, { count: 5, level: 'foundation', mix: 'sba' }, () => {})).rejects.toThrow('These notes could not be turned into questions.')
    vi.stubGlobal('fetch', async () => Response.json({ error: 'You have made a lot of question sets this hour. Please try again in 12 minutes.' }, { status: 429 }))
    await expect(requestSet({ images: [], text: 'x' }, { count: 5, level: 'foundation', mix: 'sba' }, () => {})).rejects.toThrow(/12 minutes/)
  })

  it('explains a lost connection or an unreachable service', async () => {
    vi.stubGlobal('fetch', async () => streamed(['event: stage\ndata: {"stage":"reading"}\n\n']))
    await expect(requestSet({ images: [], text: 'x' }, { count: 5, level: 'foundation', mix: 'sba' }, () => {})).rejects.toThrow(/connection was lost/)
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    const e = await requestSet({ images: [], text: 'x' }, { count: 5, level: 'foundation', mix: 'sba' }, () => {}).catch((x) => x)
    expect(e).toBeInstanceOf(NotesError)
    expect(e.message).toMatch(/could not reach/)
  })
})
