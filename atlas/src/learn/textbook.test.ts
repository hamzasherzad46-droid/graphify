import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BONE_BY_ID } from '../data/bones'
import { TOPICS } from './topics'
import type { Block, Inline, Section } from './textbook'

const DIR = join(__dirname, '..', '..', 'content', 'textbook')
const MEDIA = join(__dirname, '..', '..', 'public', 'textbook')
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'))
const sections: Section[] = readdirSync(DIR)
  .filter((f) => f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))

const inlines = (b: Block): Inline[] =>
  b.t === 'p' ? b.inl : b.t === 'list' ? b.items.flat() : b.t === 'fig' ? b.caption : b.t === 'table' ? [...b.head, ...b.rows].flat(2) : b.t === 'note' ? b.blocks.flatMap(inlines) : []
const all = (s: Section) => [...s.blocks.flatMap(inlines), ...s.keyPoints.flatMap((k) => [...k.lead, ...k.rest]), ...s.objectives.flat(), ...s.quickCheck.flatMap((q) => [...q.stem, ...q.options.flat()])]
const figs = (bs: Block[]): Extract<Block, { t: 'fig' }>[] => bs.flatMap((b) => (b.t === 'fig' ? [b] : b.t === 'note' ? figs(b.blocks) : []))

describe('textbook content (OpenStax A&P 2e, chapters 6–9)', () => {
  it('has all 28 sections, each in the index and in an Atlas topic', () => {
    expect(sections).toHaveLength(28)
    const topics = new Set(TOPICS.map((t) => t.id))
    for (const s of sections) {
      expect(index.sections.some((x: { id: string }) => x.id === s.id), s.id).toBe(true)
      expect(topics.has(s.topic), s.id).toBe(true)
    }
    for (const t of TOPICS) expect(sections.some((s) => s.topic === t.id), t.id).toBe(true)
  })
  it('comes from the CC BY 4.0 release and lists the changes made', () => {
    for (const s of sections) {
      expect(s.source.license).toBe('CC BY 4.0')
      expect(s.source.commit).toBe('b0058a743bdd2cc08196abaaa7d5469970c0d80c')
      expect(s.changes.length).toBeGreaterThan(3)
    }
  })
  it('links only to real bones', () => {
    let links = 0
    for (const s of sections)
      for (const x of all(s))
        if (typeof x !== 'string' && 'bone' in x && x.bone) {
          links++
          expect(BONE_BY_ID.has(x.bone), `${s.id}: ${x.t} → ${x.bone}`).toBe(true)
        }
    expect(links).toBeGreaterThan(1000)
  })
  it('links "axis" (C2) only in a sentence about the neck vertebrae', () => {
    const paras = (bs: Block[]): Inline[][] => bs.flatMap((b) => (b.t === 'p' ? [b.inl] : b.t === 'note' ? paras(b.blocks) : []))
    let n = 0
    for (const s of sections)
      for (const inl of paras(s.blocks)) {
        const text = inl.map((x) => (typeof x === 'string' ? x : x.k === 'bone' && /^axis$/i.test(x.t) ? '⟦axis⟧' : x.t)).join('')
        for (const sentence of text.split(/(?<=[.!?])\s+/))
          if (sentence.includes('⟦axis⟧')) {
            n++
            expect(sentence.replace(/⟦axis⟧/g, ''), s.id).toMatch(/\b(atlas|C1|C2|dens|vertebra|cervical|atlantoaxial)\b/i)
          }
      }
    expect(n).toBeGreaterThan(5)
  })
  it('has every figure file, with a label and alt text', () => {
    for (const s of sections)
      for (const f of figs(s.blocks)) {
        expect(existsSync(join(MEDIA, '..', f.src)), f.src).toBe(true)
        expect(f.label, f.id).toMatch(/^Figure \d\.\d+$/)
        expect(f.alt.length, f.id).toBeGreaterThan(10)
      }
  })
  it('has stable, unique paragraph ids (highlights anchor to them)', () => {
    for (const s of sections) {
      const ids = s.blocks.filter((b) => b.t === 'p').map((b) => b.id)
      expect(new Set(ids).size, s.id).toBe(ids.length)
      for (const id of ids) expect(id, s.id).toMatch(/^[\w-]+$/)
    }
  })
  it('has a quick check of three questions (two where the book has only two) with valid answers', () => {
    for (const s of sections.filter((x) => x.num.includes('.'))) {
      expect(s.quickCheck.length, s.id).toBe(Math.min(3, s.quickCheck.length + s.review.length))
      expect(s.quickCheck.length, s.id).toBeGreaterThanOrEqual(2)
      for (const q of s.quickCheck) expect(q.answer >= 0 && q.answer < q.options.length, q.id).toBe(true)
    }
  })
})

describe("classic reference (Gray's Anatomy, 1918)", () => {
  const CDIR = join(__dirname, '..', '..', 'content', 'classic')
  const classics = readdirSync(CDIR).map((f) => JSON.parse(readFileSync(join(CDIR, f), 'utf8')))
  it('covers the region sections, each bone chapter starting with its text', () => {
    expect(classics.map((c) => c.section).sort()).toEqual(['s7-2', 's7-3', 's7-4', 's8-1', 's8-2', 's8-3', 's8-4'])
    for (const c of classics)
      for (const e of c.entries) {
        const first = e.blocks.find((b: Block) => b.t === 'p') as Extract<Block, { t: 'p' }>
        const text = first.inl.map((x) => (typeof x === 'string' ? x : x.t)).join('')
        expect(text, e.title).toMatch(/^[A-Z(]/)
        expect(text.length, e.title).toBeGreaterThan(40)
      }
  })
  it('has no markup, entity or footnote leftovers', () => {
    const all = JSON.stringify(classics)
    expect(all).not.toMatch(/<[A-Za-z/]|&[a-z#0-9]+;|\(\*\d/)
  })
  it('has every figure file and links only to real bones', () => {
    for (const c of classics)
      for (const e of c.entries)
        for (const b of e.blocks as Block[]) {
          if (b.t === 'fig') expect(existsSync(join(MEDIA, '..', b.src)), b.src).toBe(true)
          if (b.t === 'p') for (const x of b.inl) if (typeof x !== 'string' && 'bone' in x && x.bone) expect(BONE_BY_ID.has(x.bone), x.t).toBe(true)
        }
  })
  it('is marked public domain with the 1918 edition', () => {
    for (const c of classics) expect(c.source).toMatchObject({ year: 1918, license: 'Public domain' })
  })
})
