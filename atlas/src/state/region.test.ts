import { beforeEach, describe, expect, it } from 'vitest'
import { BONES, regionBones } from '../data/bones'
import { useViewer } from './store'

const ids = (group: string, side?: 'both' | 'left' | 'right') => regionBones(group, side).map((b) => b.id)

describe('3D region views: which bones each shows', () => {
  it('holds exactly the bones of its region', () => {
    expect(regionBones('all')).toHaveLength(206)
    expect(regionBones('skull')).toHaveLength(29) // 22 skull bones, 6 ossicles, the hyoid
    expect(regionBones('spine')).toHaveLength(26) // 24 vertebrae, sacrum, coccyx
    expect(regionBones('thorax')).toHaveLength(25) // 24 ribs and the sternum
    expect(ids('pelvis').sort()).toEqual(['coccyx', 'hip_bone_left', 'hip_bone_right', 'sacrum'])
    expect(regionBones('hand')).toHaveLength(54)
    expect(regionBones('foot')).toHaveLength(52)
    expect(regionBones('upper-limb')).toHaveLength(64) // arm and hand, both sides
    expect(regionBones('lower-limb')).toHaveLength(60) // leg and foot, both sides
  })

  it('shows one side of a limb when asked, never mixing sides', () => {
    for (const g of ['upper-limb', 'hand', 'lower-limb', 'foot']) {
      const left = regionBones(g, 'left')
      const right = regionBones(g, 'right')
      expect(left.length).toBe(right.length)
      expect(left.length * 2).toBe(regionBones(g).length)
      expect(left.every((b) => b.side === 'left')).toBe(true)
      expect(right.every((b) => b.side === 'right')).toBe(true)
    }
    expect(ids('hand', 'right')).toContain('scaphoid_right')
    expect(regionBones('foot', 'left')).toHaveLength(26)
  })

  it('ignores the side for the skull and trunk, which are always shown whole', () => {
    for (const g of ['skull', 'spine', 'thorax', 'pelvis']) expect(regionBones(g, 'left')).toEqual(regionBones(g))
  })

  it('puts every bone in at least one region view', () => {
    const shown = new Set(['skull', 'spine', 'thorax', 'upper-limb', 'pelvis', 'lower-limb'].flatMap((g) => ids(g)))
    expect(BONES.filter((b) => !shown.has(b.id))).toEqual([])
  })
})

describe('3D region views: the viewer state', () => {
  beforeEach(() => useViewer.getState().showRegion('all', 'right'))

  it('shows a region, framing it, with the exploded view set to it', () => {
    useViewer.getState().showRegion('foot')
    const s = useViewer.getState()
    expect(s.region).toBe('foot')
    expect(s.regionIds).toEqual(ids('foot', 'right'))
    expect(s.explodeGroup).toBe('foot')
    expect(s.camera?.kind).toBe('fit')
    useViewer.getState().showRegion('foot', 'both')
    expect(useViewer.getState().regionIds).toHaveLength(52)
  })

  it('brings back the whole skeleton when a bone outside the region is chosen (e.g. from search)', () => {
    useViewer.getState().showRegion('skull')
    useViewer.getState().select('mandible')
    expect(useViewer.getState().region).toBe('skull')
    useViewer.getState().select('sternum')
    expect(useViewer.getState()).toMatchObject({ region: 'all', regionIds: null, selectedId: 'sternum' })
  })

  it('isolating a bone and then "Show all" returns to the region, not the whole skeleton', () => {
    useViewer.getState().showRegion('pelvis')
    useViewer.getState().isolate('sacrum')
    useViewer.getState().showAll()
    expect(useViewer.getState()).toMatchObject({ region: 'pelvis', isolated: null })
    expect(useViewer.getState().regionIds).toHaveLength(4)
  })

  it('a study session uses the whole skeleton, and the region comes back afterwards', () => {
    useViewer.getState().showRegion('hand', 'left')
    useViewer.getState().startStudy()
    expect(useViewer.getState().regionIds).toBeNull()
    useViewer.getState().endStudy()
    expect(useViewer.getState()).toMatchObject({ region: 'hand', regionSide: 'left' })
    expect(useViewer.getState().regionIds).toEqual(ids('hand', 'left'))
  })
})
