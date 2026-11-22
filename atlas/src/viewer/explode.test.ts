import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { BONES } from '../data/bones'
import male from '../data/model-male.json'
import female from '../data/model-female.json'
import { registry } from './registry'
import { computeExplode, explodeDirs } from './explode'

for (const [sex, model] of [['male', male], ['female', female]] as const) {
  describe(`exploded view (${sex})`, () => {
    beforeAll(() => {
      registry.rest.clear()
      for (const [id, m] of Object.entries(model.meshes)) if (m.kind === 'bone') registry.rest.set(id, new THREE.Vector3(...m.center))
      computeExplode()
    })
    it('moves every bone when the whole skeleton explodes', () => {
      const all = explodeDirs.get('all')!
      for (const b of BONES) expect(all.get(b.id)?.length(), b.id).toBeGreaterThan(0.001)
    })
    it('moves only the chosen region', () => {
      const skull = explodeDirs.get('skull')!
      expect(skull.has('frontal_bone')).toBe(true)
      expect(skull.has('vertebra_c1')).toBe(false)
      expect(explodeDirs.get('hand')!.has('radius_left')).toBe(false)
    })
    it('keeps the spine clear of the skull when the spine explodes alone', () => {
      const c1 = explodeDirs.get('spine')!.get('vertebra_c1')!
      expect(c1.y).toBeLessThan(0.08) // a little upward spread at most
      expect(c1.z).toBeLessThan(-0.1) // the column moves back, behind the skull
    })
    it('moves left and right limbs apart, not together', () => {
      const all = explodeDirs.get('all')!
      expect(all.get('humerus_left')!.x).toBeGreaterThan(0)
      expect(all.get('humerus_right')!.x).toBeLessThan(0)
    })
  })
}
