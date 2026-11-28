import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BONE_BY_ID } from '../data/bones'
import { TOPICS } from './topics'
import { factsOf, needsReview, splitTerms, structureParagraphs, termMatcher, type Structure } from './structures'

const ROOT = join(__dirname, '..', '..')
const DIR = join(ROOT, 'content', 'structures')
const lessons: Structure[] = readdirSync(DIR).map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))
const PARTS: Record<string, unknown> = JSON.parse(readFileSync(join(ROOT, 'content', 'parts', 'male.json'), 'utf8')).parts
const glossary: Record<string, unknown> = JSON.parse(readFileSync(join(ROOT, 'data', 'glossary.json'), 'utf8')).terms

const paragraphs = new Map<string, Set<string>>()
function idsOf(section: string): Set<string> {
  if (!paragraphs.has(section)) {
    const ids = new Set<string>()
    JSON.stringify(JSON.parse(readFileSync(join(ROOT, 'content', 'textbook', `${section}.json`), 'utf8'))).replace(/"id":"([^"]+)"/g, (_, id: string) => (ids.add(id), ''))
    paragraphs.set(section, ids)
  }
  return paragraphs.get(section)!
}

/** Sentences in a text (a full stop, question or exclamation mark, then a capital or an opening bracket or quote). */
const sentences = (s: string) =>
  s
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/)
    .filter(Boolean)
const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length

/** Every piece of Atlas-written text in a lesson, with where it is. */
function texts(s: Structure): [string, string][] {
  const out: [string, string][] = []
  const add = (where: string, t: string) => out.push([`${s.id} ${where}`, t])
  add('one line', s.oneLine.main.t)
  add('one line simpler', s.oneLine.simpler.t)
  add('one line deeper', s.oneLine.deeper.t)
  s.where.facts.forEach((f, k) => add(`where ${k}`, f.t))
  add('where simpler', s.where.simpler.t)
  add('where deeper', s.where.deeper.t)
  s.features.items.forEach((f) => add(`feature ${f.name}`, f.t))
  add('features simpler', s.features.simpler.t)
  add('features deeper', s.features.deeper.t)
  s.formFunction.facts.forEach((f, k) => add(`form ${k}`, f.t))
  add('form simpler', s.formFunction.simpler.t)
  s.relations.items.forEach((f) => add(`relation ${f.name}`, f.t))
  add('relations simpler', s.relations.simpler.t)
  s.development.facts.forEach((f, k) => add(`development ${k}`, f.t))
  s.variations.facts.forEach((f, k) => add(`variation ${k}`, f.t))
  s.clinical.items.forEach((c, k) => [c.injury, c.damaged, c.cannotDo, c.why].forEach((t, j) => add(`clinical ${k}.${j}`, t)))
  s.tutorial.items.forEach((t, k) => [t.q, ...t.model].forEach((x, j) => add(`tutorial ${k}.${j}`, x)))
  s.check.forEach((q, k) => [q.stem, q.why, ...q.options].forEach((x, j) => add(`check ${k}.${j}`, x)))
  return out
}

describe('structure lessons', () => {
  it('has the five review samples', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(5)
    for (const id of ['humerus', 'mandible', 'scaphoid', 'scapula', 'sphenoid']) expect(lessons.map((s) => s.id)).toContain(id)
  })

  it('uses real bones and topics, and every layer', () => {
    const topics = new Set(TOPICS.map((t) => t.id))
    for (const s of lessons) {
      // A lesson is on a bone, or on a muscle or organ of the male model: exactly one of the two.
      expect(!!s.bone !== !!s.part, s.id).toBe(true)
      if (s.part) {
        // A muscle or organ lesson has a title and lists every part it covers, its main part among them.
        expect(s.title, s.id).toBeTruthy()
        expect(s.parts, s.id).toContain(s.part)
        for (const p of s.parts!) expect(PARTS[p], `${s.id}: ${p}`).toBeTruthy()
      } else {
        expect(BONE_BY_ID.has(s.bone!), s.id).toBe(true)
        // A group lesson names its group and lists every bone it covers, its main bone among them.
        if (s.bones) {
          expect(s.title, s.id).toBeTruthy()
          expect(s.bones, s.id).toContain(s.bone)
          for (const b of s.bones) expect(BONE_BY_ID.has(b), `${s.id}: ${b}`).toBe(true)
        } else expect(s.title, s.id).toBeUndefined()
      }
      expect(topics.has(s.topic), s.id).toBe(true)
      expect(s.source, s.id).toMatch(/^OpenStax A&P 2e: /)
      expect(s.where.facts.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.features.items.length, s.id).toBeGreaterThanOrEqual(4)
      expect(s.formFunction.facts.length, s.id).toBeGreaterThanOrEqual(2)
      expect(s.relations.items.length, s.id).toBeGreaterThanOrEqual(4)
      expect(s.development.facts.length, s.id).toBeGreaterThanOrEqual(1)
      expect(s.clinical.items.length, s.id).toBeGreaterThanOrEqual(2)
      // Tutorial questions: one of each kind.
      expect(s.tutorial.items.map((t) => t.kind).sort(), s.id).toEqual(['compare', 'explain', 'predict'])
      for (const t of s.tutorial.items) expect(t.model.length, `${s.id} ${t.q}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('reasons clinically: injury, structure damaged, what the patient cannot do, why', () => {
    for (const s of lessons) for (const c of s.clinical.items) for (const k of ['injury', 'damaged', 'cannotDo', 'why'] as const) expect(c[k].trim(), `${s.id} ${k}`).toBeTruthy()
  })

  it('ends with three questions, four options each, answers in different places', () => {
    for (const s of lessons) {
      expect(s.check, s.id).toHaveLength(3)
      for (const q of s.check) {
        expect(q.options, `${s.id} ${q.stem}`).toHaveLength(4)
        expect(new Set(q.options).size).toBe(4)
        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(4)
        expect(q.src.length, `${s.id} ${q.stem}`).toBeGreaterThan(0)
      }
      expect(new Set(s.check.map((q) => q.answer)).size, s.id).toBeGreaterThan(1)
    }
  })

  it('sources every statement: an OpenStax paragraph or glossary term that exists, or a note of what needs checking', () => {
    for (const s of lessons)
      for (const f of factsOf(s)) {
        expect(f.src.length > 0 || !!f.check, `${s.id}: ${f.t}`).toBe(true)
        for (const src of f.src) {
          if (src.startsWith('glossary:')) expect(glossary[src.slice(9)], `${s.id}: ${src}`).toBeTruthy()
          else if (src.startsWith('reviewer:')) expect(src, s.id).toMatch(/^reviewer:\d{4}-\d{2}-\d{2}$/)
          else {
            const [section, pid] = src.split('#')
            expect(idsOf(section).has(pid), `${s.id}: ${src}`).toBe(true)
          }
        }
      }
  })

  it('stays a draft while anything awaits a source check', () => {
    for (const s of lessons) {
      if (s.reviewStatus === 'reviewed') expect(needsReview(s), s.id).toEqual([])
      expect(s.reviewStatus, s.id).toBe('draft')
    }
  })

  it('writes short sentences (at most 20 words) and short paragraphs (at most 3 sentences)', () => {
    for (const s of lessons)
      for (const [where, t] of texts(s)) {
        const ss = sentences(t)
        expect(ss.length, `${where}: ${t}`).toBeLessThanOrEqual(3)
        for (const x of ss) expect(words(x), `${where}: ${x}`).toBeLessThanOrEqual(20)
      }
  })

  it('gives every paragraph an id for highlights and notes', () => {
    const s = lessons[0]
    const p = structureParagraphs(s)
    expect(p.get(`${s.id}-one`)).toBe(s.oneLine.main.t)
    expect([...p.keys()].filter((k) => k.includes('-feat-'))).toHaveLength(s.features.items.length)
    expect([...p.keys()].filter((k) => k.includes('-clin-'))).toHaveLength(s.clinical.items.length)
  })
})

describe('glossary terms in text', () => {
  const re = termMatcher(['glenoid cavity', 'glenoid', 'scapula'])

  it('prefers the longest term and marks each term once', () => {
    const seen = new Set<string>()
    expect(splitTerms('The glenoid cavity of the scapula.', re, seen)).toEqual(['The ', { term: 'glenoid cavity', text: 'glenoid cavity' }, ' of the ', { term: 'scapula', text: 'scapula' }, '.'])
    expect(splitTerms('The Scapula again.', re, seen)).toEqual(['The Scapula again.'])
  })

  it('matches whole words only, in any case', () => {
    expect(splitTerms('Scapular and Glenoid.', re, new Set())).toEqual(['Scapular and ', { term: 'glenoid', text: 'Glenoid' }, '.'])
  })
})
