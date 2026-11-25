import { describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { parseReadBody, parseTopicsBody, readPages, splitTopics, tidyTopics, NOT_FOR_QUESTIONS, READ_LIMITS, BodyError, readJsonSchema, topicsJsonSchema } from './reading.ts'
import { RateLimiter } from './request.ts'
import { handler } from './index.ts'
import type { Caller } from './pipeline.ts'

/** Test fixtures only: hand-written, shaped like model output. */
const IMG = 'iVBORw0KGgo='
const page = (ref: string) => ({ ref, mediaType: 'image/png' as const, data: IMG })

function fake(...answers: unknown[]): Caller & { calls: { system: string; content: unknown[]; opts?: unknown }[] } {
  const calls: { system: string; content: unknown[]; opts?: unknown }[] = []
  return {
    calls,
    async json(system, content, _schema, opts) {
      calls.push({ system, content, opts })
      return answers.shift()
    },
  }
}

describe('reading pages', () => {
  it('returns every page asked for, in order; a skipped or illegible page comes back empty', async () => {
    const c = fake({
      pages: [
        { ref: 'p2', text: 'should be empty', legibility: 'illegible' },
        { ref: 'p1', text: '  Radius = lateral  ', legibility: 'clear' },
        { ref: 'invented', text: 'x', legibility: 'clear' },
      ],
    })
    const out = await readPages([page('p1'), page('p2'), page('p3')], c)
    expect(out).toEqual([
      { ref: 'p1', text: 'Radius = lateral', legibility: 'clear' },
      { ref: 'p2', text: '', legibility: 'illegible' },
      { ref: 'p3', text: '', legibility: 'illegible' },
    ])
    // Each image is labelled with its ref, and reading runs at medium effort.
    expect(JSON.stringify(c.calls[0].content)).toContain('Page ref: p2')
    expect(c.calls[0].opts).toEqual({ effort: 'medium' })
  })

  it('checks requests: 1 to 6 pages, base64, unique refs', () => {
    expect(parseReadBody(JSON.stringify({ pages: [page('a')] }))).toHaveLength(1)
    expect(() => parseReadBody(JSON.stringify({ pages: [] }))).toThrow(BodyError)
    expect(() => parseReadBody(JSON.stringify({ pages: Array.from({ length: READ_LIMITS.pagesPerRequest + 1 }, (_, k) => page(`p${k}`)) }))).toThrow(/at a time/)
    expect(() => parseReadBody(JSON.stringify({ pages: [{ ...page('a'), data: 'not base64!' }] }))).toThrow(/could not be read/)
    expect(() => parseReadBody(JSON.stringify({ pages: [page('a'), page('a')] }))).toThrow(/own ref/)
    expect(() => parseReadBody('{')).toThrow(/could not be read/)
  })

  it('asks for a strict schema', () => {
    expect(readJsonSchema.properties.pages.items.additionalProperties).toBe(false)
    expect(topicsJsonSchema.properties.topics.items.required).toEqual(['title', 'summary', 'refs'])
  })
})

describe('topics', () => {
  const units = ['s1', 's2', 's3', 's4', 's5'].map((ref) => ({ ref, text: `text of ${ref}` }))

  it('covers every part exactly once, in order, whatever the model returns', () => {
    const t = tidyTopics(units, [
      { title: NOT_FOR_QUESTIONS, summary: 'Title slide.', refs: ['s1'] },
      { title: 'Rotator cuff', summary: 'The four muscles.', refs: ['s4', 's3', 'made-up'] },
      { title: 'Scapula', summary: 'Its landmarks.', refs: ['s2', 's3'] },
      { title: '  ', summary: '', refs: [] },
    ])
    expect(t.map((x) => x.title)).toEqual(['Scapula', 'Rotator cuff', 'Other parts', NOT_FOR_QUESTIONS])
    expect(t.find((x) => x.title === 'Rotator cuff')!.refs).toEqual(['s3', 's4'])
    expect(t.find((x) => x.title === 'Scapula')!.refs).toEqual(['s2'])
    expect(t.find((x) => x.title === 'Other parts')!.refs).toEqual(['s5'])
    expect(t.flatMap((x) => x.refs).sort()).toEqual(units.map((u) => u.ref))
  })

  it('sends each part with its ref, cut to length', async () => {
    const c = fake({ topics: [{ title: 'All', summary: 'Everything.', refs: units.map((u) => u.ref) }] })
    const long = [{ ref: 'Lecture 3.pptx, slide 12', text: 'x'.repeat(5000) }]
    await splitTopics(long, c)
    const text = JSON.stringify(c.calls[0].content)
    expect(text).toContain('ref=\\"Lecture 3.pptx, slide 12\\"')
    expect(text.length).toBeLessThan(READ_LIMITS.unitChars + 400)
  })

  it('checks requests: drops empty parts, needs some text and unique refs', () => {
    expect(
      parseTopicsBody(
        JSON.stringify({
          units: [
            { ref: 'a', text: 'x' },
            { ref: 'b', text: ' ' },
          ],
        }),
      ),
    ).toEqual([{ ref: 'a', text: 'x' }])
    expect(() => parseTopicsBody(JSON.stringify({ units: [{ ref: 'a', text: '  ' }] }))).toThrow(/no text/)
    expect(() =>
      parseTopicsBody(
        JSON.stringify({
          units: [
            { ref: 'a', text: 'x' },
            { ref: 'a', text: 'y' },
          ],
        }),
      ),
    ).toThrow(/own ref/)
  })
})

describe('reading endpoints', () => {
  async function serve(caller: Caller, reads = new RateLimiter(10, Date.now, 3)) {
    const server = createServer(handler(caller, new RateLimiter(5), reads))
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    return { url, close: () => new Promise((r) => server.close(r)) }
  }
  const post = (url: string, path: string, body: unknown) =>
    fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5174', 'X-Atlas-Client': 'device-1' }, body: JSON.stringify(body) })

  it('reads pages and finds topics as JSON', async () => {
    const s = await serve(fake({ pages: [{ ref: 'p1', text: 'Ulna = medial', legibility: 'clear' }] }, { topics: [{ title: 'Forearm', summary: 'Its bones.', refs: ['p1'] }] }))
    try {
      const r1 = await post(s.url, '/api/notes/read', { pages: [page('p1')] })
      expect(r1.status).toBe(200)
      expect(await r1.json()).toEqual({ pages: [{ ref: 'p1', text: 'Ulna = medial', legibility: 'clear' }] })
      const r2 = await post(s.url, '/api/notes/topics', { units: [{ ref: 'p1', text: 'Ulna = medial' }] })
      expect(await r2.json()).toEqual({ topics: [{ title: 'Forearm', summary: 'Its bones.', refs: ['p1'] }] })
    } finally {
      await s.close()
    }
  })

  it('answers a bad request with a message, and refunds it', async () => {
    const reads = new RateLimiter(1, Date.now, 3)
    const s = await serve(fake({ pages: [{ ref: 'p1', text: 'ok', legibility: 'clear' }] }), reads)
    try {
      const bad = await post(s.url, '/api/notes/read', { pages: [] })
      expect(bad.status).toBe(400)
      expect(((await bad.json()) as { error: string }).error).toMatch(/pages at a time/)
      // The refund leaves the one request this hour for a good one.
      expect((await post(s.url, '/api/notes/read', { pages: [page('p1')] })).status).toBe(200)
      expect((await post(s.url, '/api/notes/read', { pages: [page('p1')] })).status).toBe(429)
    } finally {
      await s.close()
    }
  })
})

describe('rate limiter with parallel requests', () => {
  it('allows up to `concurrent` at once', () => {
    const r = new RateLimiter(100, () => 0, 3)
    expect([r.take('a'), r.take('a'), r.take('a')]).toEqual([0, 0, 0])
    expect(r.take('a')).toBeGreaterThan(0)
    r.done('a')
    expect(r.take('a')).toBe(0)
  })
})
