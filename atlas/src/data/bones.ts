import type { Bone } from './types'
import regionsJson from '../../content/regions.json'

// Every bone file is bundled at build time: editing content/bones/*.json needs no code change.
const files = import.meta.glob<Bone>('../../content/bones/*.json', { eager: true, import: 'default' })

export const BONES: Bone[] = Object.values(files).sort((a, b) => a.id.localeCompare(b.id))
export const BONE_BY_ID: ReadonlyMap<string, Bone> = new Map(BONES.map((b) => [b.id, b]))

export const REGIONS = regionsJson.regions
export const GROUPS = regionsJson.groups

/** Which bones a 3D region view shows: the left, the right or both. */
export type RegionSide = 'both' | 'left' | 'right'

/** Regions shown one side at a time (the limbs): the trunk and skull are always shown whole. */
export const SIDED_REGIONS: ReadonlySet<string> = new Set(['upper-limb', 'hand', 'lower-limb', 'foot'])

/** The bones of a regions.json group ('all' = every bone), optionally one side only (limbs). */
export function regionBones(group: string, side: RegionSide = 'both'): Bone[] {
  const g = GROUPS.find((x) => x.id === group)
  const inGroup = g ? BONES.filter((b) => g.regions.includes(b.region) || (g.bones ?? []).includes(b.id)) : BONES
  return side === 'both' || !SIDED_REGIONS.has(group) ? inGroup : inGroup.filter((b) => b.side === side)
}

export const SIDE_SHORT: Record<Bone['side'], string> = { left: 'L', right: 'R', midline: '' }

/** "Femur (left)", "Sternum". */
export function displayName(b: Bone): string {
  return b.side === 'midline' ? b.name : `${b.name} (${b.side})`
}
