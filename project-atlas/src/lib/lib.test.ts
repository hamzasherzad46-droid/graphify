import { describe, expect, it } from 'vitest'
import { acceptedAnswers, activeAnswer, applyKey, emptyTyping, normalizeAnswer, type KeyInput, type TypingState } from './typing'
import { meshMatchesKey } from './meshMatch'
import { INTERVALS, isMissed, prioritise, requeue, updateRecord } from './srs'

function typeAll(text: string, answers: string[]) {
  let state: TypingState = emptyTyping
  const results: string[] = []
  for (const char of text) {
    const r = applyKey(state, { type: 'char', char }, answers)
    state = r.state
    results.push(r.result)
  }
  return { state, results }
}

describe('typing engine', () => {
  const clavicle = acceptedAnswers('clavicle', ['collarbone', 'collar bone'])

  it('normalises case, accents and punctuation', () => {
    expect(normalizeAnswer('  Médial–Epicondyle ')).toBe('medial epicondyle')
  })

  it('completes on the last correct letter, case-insensitively', () => {
    const { results } = typeAll('CLAVICLE', clavicle)
    expect(results.at(-1)).toBe('complete')
    expect(results.slice(0, -1).every((r) => r === 'correct')).toBe(true)
  })

  it('rejects wrong letters without inserting them', () => {
    const r = applyKey({ buffer: 'cla', awaitingEnter: false }, { type: 'char', char: 'x' }, clavicle)
    expect(r.result).toBe('wrong')
    expect(r.state.buffer).toBe('cla')
  })

  it('accepts synonyms and switches the active answer', () => {
    const { state, results } = typeAll('collar bone', clavicle)
    expect(results.at(-1)).toBe('complete')
    expect(activeAnswer('coll', clavicle)).toBe('collarbone')
    expect(state.buffer).toBe('collar bone')
  })

  it('supports multi-word answers with spaces', () => {
    const answers = acceptedAnswers('medial epicondyle', [])
    expect(typeAll('medial epicondyle', answers).results.at(-1)).toBe('complete')
    expect(applyKey(emptyTyping, { type: 'char', char: ' ' }, answers).result).toBe('ignored')
  })

  it('waits for Enter when a full answer is a prefix of a longer one', () => {
    const answers = acceptedAnswers('frontal bone', ['frontal'])
    const { state, results } = typeAll('frontal', answers)
    expect(results.at(-1)).toBe('correct')
    expect(state.awaitingEnter).toBe(true)
    expect(applyKey(state, { type: 'enter' }, answers).result).toBe('complete')
    expect(typeAll('frontal bone', answers).results.at(-1)).toBe('complete')
  })

  it('backspace and hint', () => {
    const answers = acceptedAnswers('ulna', [])
    let s: TypingState = { buffer: 'ul', awaitingEnter: false }
    s = applyKey(s, { type: 'backspace' }, answers).state
    expect(s.buffer).toBe('u')
    const hint: KeyInput = { type: 'hint' }
    s = applyKey(s, hint, answers).state
    s = applyKey(s, hint, answers).state
    expect(s.buffer).toBe('uln')
    expect(applyKey(s, hint, answers).result).toBe('complete')
  })
})

describe('mesh matching', () => {
  it.each([
    ['Humerus.l', 'humerus', true],
    ['Humerusl', 'humerus', true],
    ['humerus_R', 'humerus', true],
    ['Rib 3.r', 'rib', true],
    ['medial_epicondyle.l', 'medial_epicondyle', true],
    ['Temporalis.l', 'temporal', false],
    ['nasal_concha', 'nasal', false],
  ])('%s vs %s → %s', (mesh, key, expected) => {
    expect(meshMatchesKey(mesh, key)).toBe(expected)
  })
})

describe('spaced repetition', () => {
  const now = 1_000_000
  it('moves up on perfect, resets on skip', () => {
    const a = updateRecord(undefined, 'perfect', 0, now)
    expect(a.box).toBe(1)
    expect(a.dueAt).toBe(now + INTERVALS[1])
    const b = updateRecord(a, 'failed', 0, now)
    expect(b.box).toBe(0)
    expect(b.attempts).toBe(2)
    expect(b.correct).toBe(1)
    expect(b.errors).toBe(1)
  })

  it('puts overdue items first, mastered not-due items last', () => {
    const items = [
      { id: 'mastered', difficulty: 1 },
      { id: 'new', difficulty: 1 },
      { id: 'overdue', difficulty: 1 },
    ]
    const records = {
      mastered: { ...updateRecord(undefined, 'perfect', 0, now), box: 5, dueAt: now + 1e9 },
      overdue: { ...updateRecord(undefined, 'ok', 2, now - 1e7) },
    }
    expect(prioritise(items, records, now, () => 0.5).map((i) => i.id)).toEqual(['overdue', 'new', 'mastered'])
  })

  it('keeps a miss in review until two perfect answers in a row', () => {
    let r = updateRecord(undefined, 'failed', 0, now)
    expect(isMissed(r)).toBe(true)
    r = updateRecord(r, 'perfect', 0, now)
    expect(isMissed(r)).toBe(true)
    r = updateRecord(r, 'perfect', 0, now)
    expect(isMissed(r)).toBe(false)
    expect(isMissed(updateRecord(undefined, 'perfect', 0, now))).toBe(false)
  })

  it('requeues a missed item a few questions later', () => {
    expect(requeue(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 0, 'a')).toEqual(['a', 'b', 'c', 'd', 'e', 'a', 'f', 'g'])
    expect(requeue(['a', 'b'], 1, 'b')).toEqual(['a', 'b', 'b'])
  })
})
