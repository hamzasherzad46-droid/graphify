import { z } from 'zod'
import { LEVELS, TYPES } from './schema.ts'
import type { Mode, Settings } from './prompts.ts'
import type { Part } from './generate.ts'

export class RequestError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/** Limits for one set: parts of the student's material (already read and checked by the student), and settings. */
export const LIMITS = { parts: 400, refChars: 120, textChars: 200000, focus: 30, focusChars: 400 }
export const COUNTS: Record<Mode, number[]> = { quick: [5, 10], mock: [20, 30, 40], flashcards: [10, 20, 30], weak: [5, 10] }

const TOO_LONG = 'The chosen topics are too long for one set. Choose fewer topics.'
const NO_TEXT = 'Choose some material with text first.'
const STUDENT_MESSAGES = [TOO_LONG, NO_TEXT]

const Body = z.object({
  mode: z.enum(['quick', 'mock', 'flashcards', 'weak']),
  count: z.number().int(),
  level: z.enum(LEVELS),
  types: z.array(z.enum(TYPES)).min(1).max(4).default(['sba']),
  parts: z
    .array(z.object({ ref: z.string().trim().min(1).max(LIMITS.refChars), topic: z.string().trim().min(1).max(LIMITS.refChars), text: z.string() }))
    .max(LIMITS.parts),
  focus: z.array(z.string().max(LIMITS.focusChars)).max(LIMITS.focus).optional(),
})

/** Check a request body; throws RequestError with a message fit to show the student. */
export function parseRequest(raw: string): { parts: Part[]; settings: Settings; focus?: string[] } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new RequestError('The request could not be read.')
  }
  const r = Body.safeParse(json)
  if (!r.success) {
    const message = r.error.issues.map((i) => i.message).find((m) => STUDENT_MESSAGES.includes(m))
    throw new RequestError(message ?? 'The request was not valid.')
  }
  const b = r.data
  if (!COUNTS[b.mode].includes(b.count)) throw new RequestError('The request was not valid.')
  const parts = b.parts.filter((p) => p.text.trim())
  if (!parts.length) throw new RequestError(NO_TEXT)
  if (parts.reduce((n, p) => n + p.text.length, 0) > LIMITS.textChars) throw new RequestError(TOO_LONG, 413)
  if (new Set(parts.map((p) => p.ref)).size !== parts.length) throw new RequestError('The request was not valid.')
  return { parts, settings: { mode: b.mode, count: b.count, level: b.level, types: [...new Set(b.types)] }, focus: b.focus }
}

/**
 * Per-client limits: `concurrent` requests at a time (one set at a time; a few pages read in parallel), and `perHour`
 * in a rolling hour. take() returns 0 when allowed (and counts the request), else the milliseconds to wait. A request
 * that fails before reaching Claude is refunded.
 */
export class RateLimiter {
  private readonly perHour: number
  private readonly now: () => number
  private readonly concurrent: number
  private readonly log = new Map<string, number[]>()
  private readonly busy = new Map<string, number>()
  constructor(perHour: number, now: () => number = Date.now, concurrent = 1) {
    this.perHour = perHour
    this.now = now
    this.concurrent = concurrent
  }
  take(client: string): number {
    const t = this.now()
    if ((this.busy.get(client) ?? 0) >= this.concurrent) return 30000
    const recent = (this.log.get(client) ?? []).filter((x) => t - x < 3600000)
    if (recent.length >= this.perHour) return 3600000 - (t - recent[0])
    recent.push(t)
    this.log.set(client, recent)
    this.busy.set(client, (this.busy.get(client) ?? 0) + 1)
    return 0
  }
  isBusy(client: string) {
    return (this.busy.get(client) ?? 0) >= this.concurrent
  }
  done(client: string) {
    const n = (this.busy.get(client) ?? 1) - 1
    if (n > 0) this.busy.set(client, n)
    else this.busy.delete(client)
  }
  refund(client: string) {
    const list = this.log.get(client)
    if (list?.length) list.pop()
  }
}
