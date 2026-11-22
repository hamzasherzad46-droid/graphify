import * as THREE from 'three'
import { BONES, BONE_BY_ID, GROUPS } from '../data/bones'
import type { Bone } from '../data/types'
import { registry } from './registry'

/**
 * Explode directions, computed from the bones' rest positions when a model loads.
 *
 * A bone moves away from the centre of its cluster (same subregion and side, e.g. the left carpals), the cluster
 * moves away from the centre of its group (e.g. the left hand), and — when the whole skeleton explodes — the
 * group moves away from the body's centre. So vertebrae separate along the spine, skull bones open out around
 * the skull, fingers fan out, and limbs move away from the trunk.
 */

const A = 1.0 // bone ← cluster centre
const B = 0.9 // cluster ← group centre
const C = 0.6 // group ← body centre (whole-skeleton explode only)
const SPINE_A = 0.25 // vertebrae: one cluster, spread gently so the column stays readable
/** Region explode: where the whole group moves, so it clears its neighbours (the spine moves back, away from the skull). */
const PULL: Record<string, [number, number, number]> = { spine: [0, 0, -0.14] }

/** The groups the whole skeleton splits into (regions.json group ids). Limbs explode per side. */
const TOP = ['skull', 'spine', 'thorax', 'upper-limb', 'pelvis', 'lower-limb']
const LATERAL = new Set(['upper-limb', 'hand', 'lower-limb', 'foot'])

function inGroup(b: Bone, g: (typeof GROUPS)[number]) {
  if ((g.bones ?? []).includes(b.id)) return true
  // Sacrum and coccyx belong to the pelvis group, not the spine group, when the whole skeleton explodes.
  return g.regions.includes(b.region)
}

const isVertebra = (b: Bone) => b.id.startsWith('vertebra_')

function centre(ids: string[]) {
  const c = new THREE.Vector3()
  let n = 0
  for (const id of ids) {
    const p = registry.rest.get(id)
    if (p) {
      c.add(p)
      n++
    }
  }
  return n ? c.divideScalar(n) : c
}

/** id → direction at 100 % for group 'all' and for each group id. */
export const explodeDirs = new Map<string, Map<string, THREE.Vector3>>()

export function computeExplode() {
  explodeDirs.clear()
  const loaded = BONES.filter((b) => registry.rest.has(b.id))
  const body = centre(loaded.map((b) => b.id))
  const groupMembers = (gid: string) => {
    const g = GROUPS.find((x) => x.id === gid)!
    let members = loaded.filter((b) => inGroup(b, g))
    if (gid === 'spine') members = members.filter((b) => b.id !== 'sacrum' && b.id !== 'coccyx')
    return members
  }
  const dirsFor = (gid: string, members: Bone[], withBody: boolean) => {
    const out = new Map<string, THREE.Vector3>()
    // Split lateral groups by side, so the left hand opens around its own centre.
    const parts = new Map<string, Bone[]>()
    for (const b of members) {
      const k = LATERAL.has(gid) ? b.side : 'all'
      parts.set(k, [...(parts.get(k) ?? []), b])
    }
    for (const part of parts.values()) {
      const gc = centre(part.map((b) => b.id))
      const clusters = new Map<string, Bone[]>()
      for (const b of part) {
        const k = isVertebra(b) ? 'spine' : `${b.region}|${b.subregion ?? ''}|${b.side}`
        clusters.set(k, [...(clusters.get(k) ?? []), b])
      }
      for (const cl of clusters.values()) {
        const cc = centre(cl.map((b) => b.id))
        for (const b of cl) {
          const d = registry.rest.get(b.id)!.clone().sub(cc).multiplyScalar(isVertebra(b) ? SPINE_A : A).addScaledVector(cc.clone().sub(gc), B)
          if (withBody) d.addScaledVector(gc.clone().sub(body), C)
          else if (PULL[gid]) d.add(new THREE.Vector3(...PULL[gid]))
          out.set(b.id, d)
        }
      }
    }
    return out
  }
  const all = new Map<string, THREE.Vector3>()
  for (const gid of TOP) for (const [id, d] of dirsFor(gid, groupMembers(gid), true)) all.set(id, d)
  explodeDirs.set('all', all)
  for (const g of GROUPS) explodeDirs.set(g.id, dirsFor(g.id, groupMembers(g.id), false))
}

/** Where a bone should be: rest + explode × amount + hand-dragged offset. */
export function targetPosition(id: string, group: string, amount: number, dragged: Record<string, [number, number, number]>, out: THREE.Vector3) {
  out.copy(registry.rest.get(id)!)
  const d = explodeDirs.get(group)?.get(id)
  if (d && amount > 0) out.addScaledVector(d, amount)
  const o = dragged[id]
  if (o) out.set(out.x + o[0], out.y + o[1], out.z + o[2])
  return out
}

export const boneName = (id: string) => BONE_BY_ID.get(id)?.name ?? id
