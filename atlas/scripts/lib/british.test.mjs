import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { britishText, setKeep, setKnownWords, speller, toBritish } from './british.mjs'

const ROOT = join(import.meta.dirname, '..', '..')
const dict = JSON.parse(readFileSync(join(ROOT, 'data', 'dictionary.json'), 'utf8'))
setKnownWords([...dict.terminologia.words, ...Object.keys(dict.approved), ...Object.keys(dict.proposed)])
setKeep(Object.keys(dict.keep))

describe('British spelling', () => {
  it('converts American spellings', () => {
    const pairs = { color: 'colour', hemorrhage: 'haemorrhage', esophagus: 'oesophagus', fiber: 'fibre', center: 'centre', tumor: 'tumour', anemia: 'anaemia', edema: 'oedema', pediatric: 'paediatric', ischemia: 'ischaemia', labeled: 'labelled', analyze: 'analyse', hyperpolarization: 'hyperpolarisation', hypovolemia: 'hypovolaemia', hematopoiesis: 'haematopoiesis', graphesthesia: 'graphaesthesia', gray: 'grey' }
    for (const [us, gb] of Object.entries(pairs)) expect(toBritish(us), us).toBe(gb)
    expect(toBritish('Hemorrhage')).toBe('Haemorrhage')
  })
  it('leaves alone what must not change', () => {
    // hemi- means half; Gray is a name; sense-dependent words need a person; medical British keeps these.
    for (const w of ['hemianopia', 'hemisection', 'hemisphere', 'Gray', 'arbor', 'meter', 'program', 'practice', 'size', 'specialty', 'sulfur', 'fetus', 'humerus']) expect(toBritish(w), w).toBeNull()
  })
  it('converts running text and says what it changed', () => {
    const r = britishText('Gray’s Anatomy describes gray matter fibers.')
    expect(r.text).toBe('Gray’s Anatomy describes grey matter fibres.')
    expect(r.changes).toEqual([
      ['gray', 'grey'],
      ['fibers', 'fibres'],
    ])
  })
  it('uses an en-GB dictionary that rejects American forms', () => {
    expect(speller.correct('colour')).toBe(true)
    expect(speller.correct('color')).toBe(false)
  })
})

describe('the text check', () => {
  it('passes on every piece of text in the app (spelling, British English, consistency)', () => {
    // Throws (non-zero exit) on any unknown word, American spelling or name written two ways; see docs/text-report.md.
    expect(() => execFileSync('node', [join(ROOT, 'scripts', 'textcheck.mjs')], { stdio: 'pipe' })).not.toThrow()
  }, 60000)
})
