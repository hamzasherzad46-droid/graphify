import { describe, expect, it } from 'vitest'
import { BONE_BY_ID } from '../data/bones'
import { canon, checkAnswer } from './answer'
import { distractors, pickBones, nameKey } from './pool'
import { weakest, type BoneStat } from './weak'

const bone = (id: string) => BONE_BY_ID.get(id)!

describe('answer checking', () => {
  it('accepts the name, synonyms and codes, ignoring case, spaces and punctuation', () => {
    expect(checkAnswer(bone('femur_left'), 'Femur')).toBe('correct')
    expect(checkAnswer(bone('femur_left'), ' thigh-bone ')).toBe('correct')
    expect(checkAnswer(bone('clavicle_right'), 'collarbone')).toBe('correct')
    expect(checkAnswer(bone('vertebra_c7'), 'C7')).toBe('correct')
    expect(checkAnswer(bone('rib_3_left'), '3rd rib')).toBe('correct')
  })
  it('accepts British and American spellings alike', () => {
    expect(canon('oesophagus')).toBe(canon('esophagus'))
    expect(canon('haemal')).toBe(canon('hemal'))
    expect(canon('centre')).toBe(canon('center'))
    expect(canon('fibre')).toBe(canon('fiber'))
    expect(checkAnswer(bone('calcaneus_left'), 'calcaneum')).toBe('correct')
  })
  it('marks small slips as close (still wrong) and others as wrong', () => {
    expect(checkAnswer(bone('femur_left'), 'femer')).toBe('close')
    expect(checkAnswer(bone('scaphoid_left'), 'scafoid')).toBe('close')
    expect(checkAnswer(bone('femur_left'), 'tibia')).toBe('wrong')
    expect(checkAnswer(bone('femur_left'), '')).toBe('wrong')
  })
  it('does not accept the Latin of a different bone or a bare side', () => {
    expect(checkAnswer(bone('femur_left'), 'left')).toBe('wrong')
  })
})

describe('question pools', () => {
  const rng = (() => {
    let s = 1
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  it('picks one bone per name, within the area', () => {
    const hand = pickBones('hand', 0, rng)
    expect(new Set(hand.map(nameKey)).size).toBe(hand.length)
    expect(hand.every((b) => b.region === 'Hand')).toBe(true)
    expect(hand.length).toBe(27) // 8 carpals + 5 metacarpals + 14 phalanx names
  })
  it('limits the count', () => {
    expect(pickBones('all', 10, rng)).toHaveLength(10)
  })
  it('gives three distinct, wrong, plausible distractors', () => {
    const d = distractors(bone('scaphoid_left'), rng)
    expect(d).toHaveLength(3)
    expect(new Set(d).size).toBe(3)
    expect(d).not.toContain('Scaphoid')
    expect(d.every((n) => ['Lunate', 'Triquetrum', 'Pisiform', 'Trapezium', 'Trapezoid', 'Capitate', 'Hamate'].includes(n))).toBe(true)
  })
})

describe('weak bones', () => {
  it('ranks by smoothed error rate and ignores bones never missed', () => {
    const stats: Record<string, BoneStat> = {
      femur_left: { seen: 5, correct: 5, last: '2026-11-20' },
      scaphoid_left: { seen: 4, correct: 1, last: '2026-11-20' },
      hamate_left: { seen: 2, correct: 1, last: '2026-11-21' },
    }
    expect(weakest(stats, 10)).toEqual(['scaphoid_left', 'hamate_left'])
  })
})

import { deckFor, queue, review, intervals } from './deck'
import { Rating } from 'ts-fsrs'

describe('flashcards (FSRS)', () => {
  it('has a see and a find card per bone name', () => {
    const deck = deckFor('hand')
    expect(deck).toHaveLength(27 * 2)
    expect(deck.find((c) => c.id === 'find:scaphoid')!.bones.map((b) => b.side).sort()).toEqual(['left', 'right'])
  })
  it('queues due cards first, then new ones up to the daily limit, see before find', () => {
    const now = new Date('2026-11-22T10:00:00Z')
    const due = review(undefined, Rating.Good, new Date('2026-11-01T10:00:00Z'))
    const q = queue('hand', { 'see:scaphoid': due }, 5, now)
    expect(q[0].id).toBe('see:scaphoid')
    expect(q).toHaveLength(1 + 5)
    expect(q.slice(1).every((c) => c.dir === 'see' || c.id === 'find:scaphoid')).toBe(true)
  })
  it('schedules Again sooner than Good sooner than Easy', () => {
    const now = new Date('2026-11-22T10:00:00Z')
    const t = (g: Rating) => new Date(review(undefined, g as never, now).due).getTime()
    expect(t(Rating.Again)).toBeLessThan(t(Rating.Good))
    expect(t(Rating.Good)).toBeLessThan(t(Rating.Easy))
    expect(Object.keys(intervals(undefined, now))).toHaveLength(4)
  })
})
