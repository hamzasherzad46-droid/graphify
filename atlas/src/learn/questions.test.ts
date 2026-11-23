import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BONE_BY_ID } from '../data/bones'
import { TOPICS } from './topics'
import type { Question } from './questions'

const DIR = join(__dirname, '..', '..', 'content', 'questions')
const all: Question[] = readdirSync(DIR).flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')).questions)

describe('exam-style questions', () => {
  it('covers every region topic', () => {
    for (const t of TOPICS.filter((x) => !x.textbookOnly)) expect(all.filter((q) => q.topic === t.id).length, t.id).toBeGreaterThanOrEqual(14)
  })
  it('gives every region topic at least two "label the 3D model" questions', () => {
    for (const t of TOPICS.filter((x) => !x.textbookOnly)) expect(all.filter((q) => q.topic === t.id && q.type === 'label').length, t.id).toBeGreaterThanOrEqual(2)
  })
  it('has unique ids, real topics, tags, a review status and a source', () => {
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length)
    const topics = new Set(TOPICS.map((t) => t.id))
    for (const q of all) {
      expect(topics.has(q.topic), q.id).toBe(true)
      expect(['core', 'common', 'advanced'], q.id).toContain(q.frequency)
      expect(['foundation', 'undergraduate', 'medical'], q.id).toContain(q.level)
      expect(['draft', 'reviewed'], q.id).toContain(q.reviewStatus)
      expect(q.source.ref.length, q.id).toBeGreaterThan(20)
      if (q.source.kind === 'openstax') expect(q.source.ref, q.id).toMatch(/CC BY 4\.0/)
      // Never presented as a real exam paper.
      expect(q.source.ref, q.id).not.toMatch(/past paper/i)
      if (q.source.kind === 'atlas') expect(q.source.ref, q.id).toMatch(/not from a real exam paper/)
    }
  })
  it('explains every question: why, exam tip, and a bone to see in 3D', () => {
    for (const q of all) {
      const sentences = q.why.split(/(?<=[.!?])\s+/).length
      expect(sentences, `${q.id} why: ${sentences} sentences`).toBeGreaterThanOrEqual(2)
      expect(sentences, `${q.id} why: ${sentences} sentences`).toBeLessThanOrEqual(4)
      expect(q.tip.length, q.id).toBeGreaterThan(30)
      expect(BONE_BY_ID.has(q.bone), `${q.id}: ${q.bone}`).toBe(true)
    }
  })
  it('gives choice questions a valid answer and one line on every wrong option', () => {
    for (const q of all.filter((x) => x.type !== 'short')) {
      expect(q.options!.length, q.id).toBe(4)
      expect(q.answer! >= 0 && q.answer! < 4, q.id).toBe(true)
      expect(q.whyNot!.length, q.id).toBe(4)
      q.whyNot!.forEach((w, k) => (k === q.answer ? expect(w, `${q.id} ${k}`).toBe('') : expect(w.length, `${q.id} ${k}`).toBeGreaterThan(20)))
    }
  })
  it('gives short-answer questions a model answer', () => {
    for (const q of all.filter((x) => x.type === 'short')) expect(q.answerText!.length, q.id).toBeGreaterThan(60)
  })
  it('lights a real bone in "label" questions, and the answer names that bone', () => {
    for (const q of all.filter((x) => x.type === 'label')) {
      const b = BONE_BY_ID.get(q.label!)
      expect(b, q.id).toBeTruthy()
      expect(q.options![q.answer!].toLowerCase(), q.id).toBe(b!.name.toLowerCase())
    }
  })
  it('spreads the answers across the options (no answer pattern to guess)', () => {
    const choice = all.filter((x) => x.type !== 'short')
    const counts = [0, 1, 2, 3].map((k) => choice.filter((q) => q.answer === k).length)
    for (const c of counts) expect(c, counts.join(',')).toBeGreaterThanOrEqual(3)
  })
})
