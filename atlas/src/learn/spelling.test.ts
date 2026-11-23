import { describe, expect, it } from 'vitest'
import { BONE_BY_ID } from '../data/bones'
import { answersFor, EVERYDAY, everydayFor, friendlyIn, hint, isKnown, press, SETS } from './spelling'
import { BONES } from '../data/bones'
import { normalize } from '../data/search'

const b = (id: string) => BONE_BY_ID.get(id)!
const typeAll = (answers: string[], s: string) => {
  let typed = ''
  let errors = 0
  let last = null as ReturnType<typeof press> | null
  for (const ch of s) {
    last = press(answers, typed, ch)
    if (last.ok) typed = last.typed
    else errors++
  }
  return { typed, errors, done: !!last && last.ok && last.done }
}

describe('letter-by-letter spelling', () => {
  it('accepts the name letter by letter, case-insensitive', () => {
    const r = typeAll(answersFor(b('femur_left')), 'FEMUR')
    expect(r).toMatchObject({ typed: 'femur', errors: 0, done: true })
  })
  it('rejects a wrong letter without changing what is typed', () => {
    const a = answersFor(b('femur_left'))
    expect(press(a, 'fe', 'x')).toMatchObject({ ok: false, typed: 'fe' })
  })
  it('accepts anatomical synonyms and British/American forms from the content', () => {
    expect(typeAll(answersFor(b('calcaneus_left')), 'calcaneum').done).toBe(true)
    expect(typeAll(answersFor(b('calcaneus_left')), 'calcaneus').done).toBe(true)
    expect(typeAll(answersFor(b('calcaneus_left')), 'os calcis').done).toBe(true)
    expect(typeAll(answersFor(b('hip_bone_left')), 'os coxae').done).toBe(true)
    expect(typeAll(answersFor(b('talus_left')), 'astragalus').done).toBe(true)
  })
  it('never completes a word with an everyday name, and says why', () => {
    for (const [id, lay] of [['clavicle_left', 'collarbone'], ['patella_left', 'kneecap'], ['incus_left', 'anvil'], ['talus_left', 'ankle bone'], ['zygomatic_bone_left', 'cheekbone']]) {
      expect(typeAll(answersFor(b(id)), lay).done, `${id} ${lay}`).toBe(false)
    }
    const a = answersFor(b('clavicle_left'))
    expect(press(a, 'c', 'o', everydayFor(b('clavicle_left')))).toMatchObject({ ok: false, everyday: 'collarbone' })
    expect(press(a, 'cl', 'x', everydayFor(b('clavicle_left')))).not.toHaveProperty('everyday')
  })
  it('lists each everyday name once', () => {
    expect(everydayFor(b('clavicle_left'))).toEqual(['collarbone'])
    expect(everydayFor(b('femur_left'))).toEqual(['thigh bone'])
    expect(everydayFor(b('frontal_bone'))).toEqual([])
  })
  it('every bone keeps at least one answer, and its own name is always one', () => {
    for (const bone of BONES) {
      const a = answersFor(bone)
      if (!/\d/.test(bone.name)) expect(a[0], bone.id).toBe(normalize(bone.name))
      expect(a.length, bone.id).toBeGreaterThan(0)
      expect(a.some((x) => EVERYDAY.has(x) && x !== normalize(bone.name)), bone.id).toBe(false)
    }
  })
  it('every everyday name in the list is used by some bone (no stale entries)', () => {
    const all = new Set(BONES.flatMap((x) => x.acceptedSpellings.map(normalize)))
    for (const e of EVERYDAY) expect(all.has(e), e).toBe(true)
  })
  it('adds a space for you when a letter is typed where the space goes', () => {
    const r = typeAll(answersFor(b('nasal_bone_left')), 'nasalbone')
    expect(r).toMatchObject({ typed: 'nasal bone', errors: 0, done: true })
    // A joined synonym is its own answer: "hipbone" is accepted as typed.
    expect(typeAll(answersFor(b('hip_bone_left')), 'hipbone')).toMatchObject({ typed: 'hipbone', done: true })
  })
  it('finishes on any whole accepted answer, even one that a longer answer starts with', () => {
    expect(typeAll(answersFor(b('hip_bone_left')), 'innominate')).toMatchObject({ typed: 'innominate', done: true })
    expect(typeAll(answersFor(b('metacarpal_1_right')), 'first metacarpal')).toMatchObject({ done: true })
  })
  it('hint reveals the next letter (and a space before it)', () => {
    const a = answersFor(b('hip_bone_left'))
    expect(hint(a, 'hi')).toMatchObject({ ok: true, typed: 'hip' })
    expect(hint(a, 'hip')).toMatchObject({ ok: true, typed: 'hip b' })
  })
  it('leaves out answers with digits (letters-only keyboard)', () => {
    expect(answersFor(b('vertebra_c7')).some((x) => /\d/.test(x))).toBe(false)
    expect(answersFor(b('vertebra_c7'))).toContain('seventh cervical vertebra')
  })
  it('known = done, no hints, at most one wrong key', () => {
    expect(isKnown({ done: true, skipped: false, hints: 0, errors: 1 })).toBe(true)
    expect(isKnown({ done: true, skipped: false, hints: 0, errors: 2 })).toBe(false)
    expect(isKnown({ done: true, skipped: false, hints: 1, errors: 0 })).toBe(false)
    expect(isKnown({ done: false, skipped: true, hints: 0, errors: 0 })).toBe(false)
  })
})

describe('spelling sets', () => {
  it('every set names real bones and has a statement', () => {
    for (const s of SETS) {
      expect(s.bones.length, s.id).toBeGreaterThanOrEqual(3)
      for (const id of s.bones) expect(BONE_BY_ID.has(id), `${s.id}: ${id}`).toBe(true)
      expect(s.statement).toMatch(/^You can now name/)
    }
  })
  it('counts in titles match the sets', () => {
    for (const s of SETS) {
      const m = s.title.match(/The (\d+) /)
      if (m) expect(s.bones.length, s.title).toBe(Number(m[1]))
    }
  })
  it('the cranial set is the 8 cranial bones', () => {
    const names = new Set(SETS.find((s) => s.id === 'cranial')!.bones.map((id) => BONE_BY_ID.get(id)!.subregion))
    expect([...names]).toEqual(['Cranial bones'])
  })
})

describe('review wording', () => {
  it('says when a card comes back in plain words', () => {
    const min = 60000
    const day = 24 * 60 * min
    expect(friendlyIn(10 * min)).toBe('in 10 minutes')
    expect(friendlyIn(3 * day)).toBe('in 3 days')
    expect(friendlyIn(day)).toBe('tomorrow')
    expect(friendlyIn(60 * day)).toBe('in 2 months')
  })
})

describe('spelling grades on the FSRS card', async () => {
  const { review } = await import('./deck')
  const { Rating } = await import('ts-fsrs')
  const now = new Date('2026-11-23T10:00:00Z')
  const days = (iso: string) => (new Date(iso).getTime() - now.getTime()) / 86400000
  it('a clean first spelling schedules the card days ahead (no same-day steps)', () => {
    expect(days(review(undefined, Rating.Good, now, { longTerm: true }).due)).toBeGreaterThanOrEqual(1.5)
  })
  it('a slip (Hard) comes back sooner than clean, a miss (Again) soonest', () => {
    const good = days(review(undefined, Rating.Good, now, { longTerm: true }).due)
    const hard = days(review(undefined, Rating.Hard, now, { longTerm: true }).due)
    const again = days(review(undefined, Rating.Again, now, { longTerm: true }).due)
    expect(again).toBeLessThanOrEqual(hard)
    expect(hard).toBeLessThan(good)
    expect(again).toBeGreaterThanOrEqual(0.9)
  })
})
