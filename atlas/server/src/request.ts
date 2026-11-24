import { z } from 'zod'
import { LEVELS } from './schema.ts'
import type { Settings } from './prompts.ts'
import type { Notes } from './pipeline.ts'

export class RequestError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/** Limits, matched to what the Claude API accepts: up to 5 MB an image, PDFs up to 32 MB in all. */
export const LIMITS = { pages: 12, imageBytes: 5 * 1024 * 1024, pdfBytes: 30 * 1024 * 1024, textChars: 40000 }

const b64bytes = (s: string) => Math.floor((s.length * 3) / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0)
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const TOO_MANY = `Up to ${LIMITS.pages} pages at a time.`
const TOO_LONG = 'The typed notes are too long for one set.'
const STUDENT_MESSAGES = [TOO_MANY, TOO_LONG]

const Body = z.object({
  images: z
    .array(z.object({ mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']), data: z.string() }))
    .max(LIMITS.pages, TOO_MANY)
    .default([]),
  pdf: z.string().optional(),
  text: z.string().max(LIMITS.textChars, TOO_LONG).optional(),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  level: z.enum(LEVELS),
  mix: z.enum(['sba', 'mixed']),
})

/** Check a request body; throws RequestError with a message fit to show the student. */
export function parseRequest(raw: string): { notes: Notes; settings: Settings } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new RequestError('The request could not be read.')
  }
  const r = Body.safeParse(json)
  if (!r.success) {
    // Our own messages are written for the student; zod's defaults are not.
    const message = r.error.issues.map((i) => i.message).find((m) => STUDENT_MESSAGES.includes(m))
    throw new RequestError(message ?? 'The request was not valid.')
  }
  const b = r.data
  for (const img of b.images) {
    if (!BASE64.test(img.data)) throw new RequestError('A page could not be read. Please take the photo again.')
    if (b64bytes(img.data) > LIMITS.imageBytes) throw new RequestError('A page photo is too large. Please take it again.', 413)
  }
  if (b.pdf !== undefined) {
    if (!BASE64.test(b.pdf)) throw new RequestError('The PDF could not be read.')
    if (b64bytes(b.pdf) > LIMITS.pdfBytes) throw new RequestError('The PDF is too large. Use a shorter file.', 413)
  }
  if (!b.images.length && !b.pdf && !b.text?.trim()) throw new RequestError('Add a photo, a PDF or some typed notes first.')
  return { notes: { images: b.images, pdf: b.pdf, text: b.text }, settings: { count: b.count, level: b.level, mix: b.mix } }
}

/**
 * Per-client limits: one set at a time, and `perHour` sets in a rolling hour. take() returns 0 when allowed (and
 * counts the request), else the milliseconds to wait. A request that fails before reaching Claude is refunded.
 */
export class RateLimiter {
  private readonly perHour: number
  private readonly now: () => number
  private readonly log = new Map<string, number[]>()
  private readonly busy = new Set<string>()
  constructor(perHour: number, now: () => number = Date.now) {
    this.perHour = perHour
    this.now = now
  }
  take(client: string): number {
    const t = this.now()
    if (this.busy.has(client)) return 30000
    const recent = (this.log.get(client) ?? []).filter((x) => t - x < 3600000)
    if (recent.length >= this.perHour) return 3600000 - (t - recent[0])
    recent.push(t)
    this.log.set(client, recent)
    this.busy.add(client)
    return 0
  }
  isBusy(client: string) {
    return this.busy.has(client)
  }
  done(client: string) {
    this.busy.delete(client)
  }
  refund(client: string) {
    const list = this.log.get(client)
    if (list?.length) list.pop()
  }
}
