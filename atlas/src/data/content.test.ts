import { describe, expect, it } from 'vitest'
import { BONES, BONE_BY_ID, GROUPS, REGIONS } from './bones'
import male from './model-male.json'
import female from './model-female.json'

const TYPES = ['long', 'short', 'flat', 'irregular', 'sesamoid']
const MODELS = { male: male.meshes, female: female.meshes } as Record<string, Record<string, { kind: string; origin?: string }>>

describe('bone content', () => {
  it('has all 206 bones', () => {
    expect(BONES).toHaveLength(206)
  })
  it.each(BONES.map((b) => [b.id, b] as const))('%s is valid', (id, b) => {
    expect(b.name, 'name').toBeTruthy()
    expect(b.latin, 'latin').toBeTruthy()
    expect(TYPES, 'type').toContain(b.type)
    expect(['left', 'right', 'midline'], 'side').toContain(b.side)
    expect(['draft', 'reviewed'], 'reviewStatus').toContain(b.reviewStatus)
    expect(REGIONS.map((r) => r.id), 'region').toContain(b.region)
    if (b.side !== 'midline') expect(id.endsWith(`_${b.side}`), 'id ends with side').toBe(true)
    for (const a of b.articulations) expect(BONE_BY_ID.has(a), `articulation ${a}`).toBe(true)
    expect(b.acceptedSpellings).toContain(b.name.toLowerCase())
    expect(b.clinical.length, 'clinical is one line').toBeLessThan(160)
    for (const [sex, meshes] of Object.entries(MODELS)) expect(meshes[id]?.kind, `mesh in skeleton-${sex}.glb`).toBe('bone')
  })
  it('articulations are mutual', () => {
    for (const b of BONES)
      for (const a of b.articulations) expect(BONE_BY_ID.get(a)!.articulations, `${a} ↔ ${b.id}`).toContain(b.id)
  })
  it('counts match the standard adult total per region', () => {
    const count = (r: string) => BONES.filter((b) => b.region === r).length
    expect(count('Skull')).toBe(28) // 22 skull bones + 6 ossicles
    expect(count('Neck')).toBe(1)
    expect(count('Vertebral column')).toBe(26)
    expect(count('Thorax')).toBe(25)
    expect(count('Upper limb') + count('Hand')).toBe(64)
    expect(count('Pelvis') + count('Lower limb') + count('Foot')).toBe(62)
  })
  it('female model: real scanned pelvis, spine and legs; everything else derived', () => {
    const scanned = Object.entries(MODELS.female).filter(([, m]) => m.origin === 'scan').map(([id]) => id)
    expect(scanned).toHaveLength(24 + 2 + 2 + 8) // C1–L5, sacrum + coccyx, hip bones, femur/patella/tibia/fibula ×2
    for (const id of ['vertebra_l5', 'sacrum', 'coccyx', 'hip_bone_left', 'femur_right']) expect(scanned).toContain(id)
  })
  it('every group names known regions or bones', () => {
    for (const g of GROUPS) {
      for (const r of g.regions) expect(REGIONS.map((x) => x.id)).toContain(r)
      for (const id of g.bones ?? []) expect(BONE_BY_ID.has(id)).toBe(true)
    }
  })
})
