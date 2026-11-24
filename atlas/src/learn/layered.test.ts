import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BONE_BY_ID } from '../data/bones'
import { TOPICS } from './topics'
import { factsOf, LEVELS, needsReview, layeredParagraphs, TYPE_NAME, type LayeredCard } from './layered'

const DIR = join(__dirname, '..', '..', 'content', 'cards')
const cards: LayeredCard[] = readdirSync(DIR).flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')).cards)

/** Paragraph ids in each imported OpenStax section. */
const TB = join(__dirname, '..', '..', 'content', 'textbook')
const paragraphs = new Map<string, Set<string>>()
function idsOf(section: string): Set<string> {
  if (!paragraphs.has(section)) {
    const ids = new Set<string>()
    JSON.stringify(JSON.parse(readFileSync(join(TB, `${section}.json`), 'utf8'))).replace(/"id":"([^"]+)"/g, (_, id: string) => (ids.add(id), ''))
    paragraphs.set(section, ids)
  }
  return paragraphs.get(section)!
}

const sentences = (s: string) => s.trim().split(/(?<=[.!?])\s+(?=[A-Z“"(])/).filter(Boolean).length
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const AMERICAN = /\b(hematoma|edema|center|fiber|color|anemia|esophagus|pediatric|labor|tumor|gray matter)\b/i

describe('layered flashcards', () => {
  it('has every required field, real topics, bones, levels and types', () => {
    const topics = new Set(TOPICS.map((t) => t.id))
    for (const c of cards) {
      for (const k of ['id', 'level', 'topic', 'structureId', 'objective', 'source', 'reviewStatus', 'front', 'answer', 'bone'] as const) expect(c[k], `${c.id} ${k}`).toBeTruthy()
      expect(topics.has(c.topic), c.id).toBe(true)
      expect(BONE_BY_ID.has(c.bone), c.id).toBe(true)
      expect(LEVELS, c.id).toContain(c.level)
      expect(Object.keys(TYPE_NAME), c.id).toContain(c.type)
      expect(c.structureId, c.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('has no duplicates, by id or by learning objective', () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
    expect(new Set(cards.map((c) => norm(c.objective))).size).toBe(cards.length)
    expect(new Set(cards.map((c) => norm(c.front))).size).toBe(cards.length)
  })

  it('keeps the front to one question and the answer short', () => {
    for (const c of cards) {
      expect(c.answer.length, c.id).toBeLessThanOrEqual(60)
      expect(c.answer, c.id).not.toMatch(/\n/)
      // One question: a single question mark at most, and no "and why…" double questions.
      expect((c.front.match(/\?/g) ?? []).length, c.id).toBeLessThanOrEqual(1)
      expect(c.front, c.id).not.toMatch(/\band (why|how|what|which)\b/i)
      expect(c.objective.split(/\.\s/).length, c.id).toBe(1)
    }
  })

  it('keeps each layer to its size', () => {
    for (const c of cards) {
      const w = sentences(c.why.t)
      expect(w, `${c.id} why`).toBeGreaterThanOrEqual(2)
      expect(w, `${c.id} why`).toBeLessThanOrEqual(3)
      if (c.simpler) expect(sentences(c.simpler.t), `${c.id} simpler`).toBeLessThanOrEqual(3)
      expect(c.depth.length, c.id).toBeGreaterThanOrEqual(3)
      expect(c.depth.length, c.id).toBeLessThanOrEqual(5)
      for (const d of c.depth) {
        expect(sentences(d.t), `${c.id} depth`).toBe(1)
        expect(d.t.length, `${c.id} depth: ${d.t}`).toBeLessThanOrEqual(115)
      }
      expect(sentences(c.clinical.t), `${c.id} clinical`).toBeLessThanOrEqual(3)
    }
  })

  it('sources every statement: an OpenStax paragraph that exists, or a note of what needs checking', () => {
    for (const c of cards)
      for (const f of factsOf(c)) {
        expect(f.src.length > 0 || !!f.check, `${c.id}: ${f.t}`).toBe(true)
        for (const s of f.src) {
          const [section, pid] = s.split('#')
          expect(idsOf(section).has(pid), `${c.id}: ${s}`).toBe(true)
        }
      }
  })

  it('marks nothing reviewed while it still needs a source check', () => {
    for (const c of cards) if (c.reviewStatus === 'reviewed') expect(needsReview(c), c.id).toEqual([])
    // At this stage every card is a draft awaiting academic review.
    for (const c of cards) expect(c.reviewStatus, c.id).toBe('draft')
  })

  it('never gives the answer away with the 3D view on the front', () => {
    for (const c of cards) if (c.frontView && c.type !== 'identify') expect(norm(c.answer), c.id).not.toContain(norm(BONE_BY_ID.get(c.bone)!.name))
  })

  it('names a bone exactly as the bone database does (one source of truth)', () => {
    for (const c of cards) if (c.type === 'identify') expect(c.answer, c.id).toBe(BONE_BY_ID.get(c.bone)!.name)
  })

  it('writes British English', () => {
    for (const c of cards) for (const t of [c.front, c.answer, c.objective, ...factsOf(c).map((f) => f.t)]) expect(t, c.id).not.toMatch(AMERICAN)
  })

  it('gives every part of the back a paragraph id for highlights and notes', () => {
    const c = cards[0]
    const p = layeredParagraphs(c)
    expect(p.get(`${c.id}-why`)).toBe(c.why.t)
    expect([...p.keys()].filter((k) => k.includes('-depth-'))).toHaveLength(c.depth.length)
  })
})
