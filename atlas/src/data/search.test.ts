import { describe, expect, it } from 'vitest'
import { BONES } from './bones'
import { createSearch, editDistance } from './search'

const search = createSearch(BONES)
const top = (q: string) => search(q)[0]?.bone.id

describe('search', () => {
  it('finds exact names', () => {
    expect(top('femur')).toBe('femur_left')
    expect(top('sternum')).toBe('sternum')
    expect(top('mandible')).toBe('mandible')
  })
  it('tolerates small typos', () => {
    expect(top('femer')).toBe('femur_left')
    expect(top('calcaneous')).toBe('calcaneus_left')
    expect(top('scafoid')).toBe('scaphoid_left')
    expect(top('humorus')).toBe('humerus_left')
    expect(top('clavical')).toBe('clavicle_left')
    expect(top('sphenoyd')).toBe('sphenoid_bone')
  })
  it('filters by side', () => {
    expect(top('right femur')).toBe('femur_right')
    expect(top('left humorus')).toBe('humerus_left')
  })
  it('matches while typing', () => {
    expect(top('scaph')).toBe('scaphoid_left')
    expect(top('trique')).toBe('triquetrum_left')
  })
  it('matches synonyms, Latin and codes', () => {
    expect(top('collarbone')).toBe('clavicle_left')
    expect(top('os coxae')).toBe('hip_bone_left')
    expect(top('c7')).toBe('vertebra_c7')
    expect(top('t12')).toBe('vertebra_t12')
    expect(top('kneecap')).toBe('patella_left')
    expect(top('anvil')).toBe('incus_left')
  })
  it('finds numbered bones', () => {
    expect(top('third rib')).toBe('rib_3_left')
    expect(top('fifth metatarsal right')).toBe('metatarsal_5_right')
    expect(top('distal phalanx thumb')).toBe('hand_distal_phalanx_1_left')
  })
  it('edit distance counts transpositions as one', () => {
    expect(editDistance('femur', 'fmeur')).toBe(1)
    expect(editDistance('abc', 'abc')).toBe(0)
  })
})
