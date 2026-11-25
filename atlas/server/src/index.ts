import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { claudeCaller, notesToExam, PipelineError, type Caller } from './pipeline.ts'
import { parseRequest, RequestError, RateLimiter } from './request.ts'
import type { BoneRef } from './prompts.ts'
import { BodyError, parseReadBody, parseTopicsBody, readPages, splitTopics } from './reading.ts'

/**
 * Notes to Exam server. The Claude API key stays here (ANTHROPIC_API_KEY); pages and notes are held in memory only for
 * the request and never written anywhere.
 *   POST /api/notes-to-exam  notes and settings → server-sent events ("stage", then "result" or "error")
 *   POST /api/notes/read     up to 6 page images → their transcripts (JSON)
 *   POST /api/notes/topics   the text of every page, slide and section → the topics (JSON)
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required
 *   PORT                default 8787
 *   ALLOWED_ORIGINS     comma-separated origins allowed to call it (default: the app's dev and Capacitor origins)
 *   RATE_PER_HOUR       sets per client per hour (default 12)
 *   READS_PER_HOUR      page-reading and topic requests per client per hour (default 120; 3 at a time)
 *   BONES_DIR           Atlas content/bones (default: ../content/bones next to this server)
 */

const BONES_DIR = process.env.BONES_DIR ?? join(import.meta.dirname, '..', '..', 'content', 'bones')
export const BONES: BoneRef[] = readdirSync(BONES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(BONES_DIR, f), 'utf8')) as BoneRef)
  .map((b) => ({ id: b.id, name: b.name }))
  .sort((a, b) => a.id.localeCompare(b.id))

const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5174,http://localhost:4173,capacitor://localhost,https://localhost')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function handler(caller: Caller, limiter: RateLimiter, reads: RateLimiter = new RateLimiter(120, Date.now, 3)) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin ?? ''
    if (ORIGINS.includes(origin) || ORIGINS.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*')
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Atlas-Client')
    }
    if (req.method === 'OPTIONS') return void res.writeHead(204).end()
    if (req.method === 'GET' && req.url === '/health') return void res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
    if (req.method !== 'POST' || !['/api/notes-to-exam', '/api/notes/read', '/api/notes/topics'].includes(req.url ?? '')) return void res.writeHead(404).end()
    if (origin && !ORIGINS.includes(origin) && !ORIGINS.includes('*')) return void res.writeHead(403).end()
    if (req.url !== '/api/notes-to-exam') return reading(req, res, caller, reads)

    // One set at a time, a limited number an hour, per client (device id, falling back to the address).
    const client = String(req.headers['x-atlas-client'] ?? req.socket.remoteAddress ?? 'unknown').slice(0, 80)
    const wait = limiter.take(client)
    if (wait > 0) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(wait / 1000)) })
      const minutes = Math.ceil(wait / 60000)
      const error = limiter.isBusy(client)
        ? 'Your last set is still being written. Please wait for it to finish.'
        : `You have made a lot of question sets this hour. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
      return void res.end(JSON.stringify({ error }))
    }

    let parsed
    try {
      parsed = parseRequest(await readBody(req))
    } catch (e) {
      limiter.refund(client)
      const message = e instanceof RequestError ? e.message : 'The request could not be read.'
      res.writeHead(e instanceof RequestError && e.status ? e.status : 400, { 'Content-Type': 'application/json' })
      return void res.end(JSON.stringify({ error: message }))
    }

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' })
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    // Keep the connection alive through proxies during long thinking.
    const ping = setInterval(() => res.write(': ping\n\n'), 15000)
    try {
      const result = await notesToExam(parsed.notes, parsed.settings, BONES, caller, (stage) => send('stage', { stage }))
      send('result', result)
    } catch (e) {
      limiter.refund(client)
      send('error', { message: e instanceof PipelineError ? e.message : 'Something went wrong. Please try again.' })
      if (!(e instanceof PipelineError)) console.error(e)
    } finally {
      clearInterval(ping)
      limiter.done(client)
      res.end()
    }
  }
}

/** Page reading and topics: one JSON answer each. */
async function reading(req: IncomingMessage, res: ServerResponse, caller: Caller, reads: RateLimiter) {
  const reply = (status: number, body: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body))
  const client = String(req.headers['x-atlas-client'] ?? req.socket.remoteAddress ?? 'unknown').slice(0, 80)
  const wait = reads.take(client)
  if (wait > 0) {
    res.setHeader('Retry-After', String(Math.ceil(wait / 1000)))
    return reply(429, { error: reads.isBusy(client) ? 'Atlas is still reading your last pages.' : 'You have read a lot of pages this hour. Please try again later.' })
  }
  try {
    const raw = await readBody(req)
    if (req.url === '/api/notes/read') reply(200, { pages: await readPages(parseReadBody(raw), caller) })
    else reply(200, { topics: await splitTopics(parseTopicsBody(raw), caller) })
  } catch (e) {
    reads.refund(client)
    if (e instanceof BodyError || e instanceof RequestError) reply(e.status ?? 400, { error: e.message })
    else if (e instanceof PipelineError) reply(502, { error: e.message })
    else {
      console.error(e)
      reply(500, { error: 'Something went wrong. Please try again.' })
    }
  } finally {
    reads.done(client)
  }
}

const MAX_BODY = 40 * 1024 * 1024
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new RequestError('The notes are too large. Use fewer pages.', 413))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

if (import.meta.main) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY to start the Notes to Exam server.')
    process.exit(1)
  }
  const port = Number(process.env.PORT ?? 8787)
  createServer(
    handler(claudeCaller(new Anthropic()), new RateLimiter(Number(process.env.RATE_PER_HOUR ?? 12)), new RateLimiter(Number(process.env.READS_PER_HOUR ?? 120), Date.now, 3)),
  ).listen(port, () =>
    console.log(`Notes to Exam server on :${port} (${BONES.length} bones; origins: ${ORIGINS.join(', ')})`),
  )
}
