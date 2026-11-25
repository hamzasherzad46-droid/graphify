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

describe('authoritative sources', async () => {
  const { sourceOf, derivedFrom } = await import('./sources.mjs')
  it('approves British forms of source words, never the American form itself', () => {
    expect(sourceOf('haematoma')).toBeTruthy() // MeSH has "hematoma"
    expect(sourceOf('hematoma')).toBeNull()
    expect(sourceOf('rhinorrhoea')).toBeTruthy()
    expect(sourceOf('osteoblast')).toBeTruthy() // OpenStax glossary
  })
  it('approves words formed regularly from source words', () => {
    expect(derivedFrom('reoxygenation')).toMatch(/oxygenation/)
    expect(derivedFrom('hyperpolarising')).toMatch(/hyperpolarisation/)
    expect(derivedFrom('qwertyfoo')).toBeNull()
  })
})

describe('abbreviations', async () => {
  const { firstUses, partsOf } = await import('./abbreviations.mjs')
  const run = (texts, fix = true) => {
    const holder = { texts: [...texts] }
    const r = firstUses(partsOf(holder), { fix })
    return { ...r, texts: holder.texts }
  }
  it('writes an abbreviation out the first time it appears in a lesson, once', () => {
    const r = run(['The CNS is the brain and spinal cord.', 'The CNS is protected by bone.'])
    expect(r.texts).toEqual(['The central nervous system (CNS) is the brain and spinal cord.', 'The CNS is protected by bone.'])
  })
  it('leaves one already defined, either way round', () => {
    expect(run(['the central nervous system (CNS) and the CNS']).written).toEqual([])
    expect(run(['CNS (central nervous system) and CNS']).written).toEqual([])
  })
  it('counts a plural as its singular, and skips names and units', () => {
    expect(run(['potentials (PSPs). An excitatory PSP']).written).toEqual([])
    expect(run(['Photo: Benjamin J. DeLong. 120 mmHg.']).written).toEqual([])
  })
  it('capitalises a full form that starts a sentence', () => {
    expect(run(['CSF bathes the brain.']).texts[0]).toBe('Cerebrospinal fluid (CSF) bathes the brain.')
  })
})
