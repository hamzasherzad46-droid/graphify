import type { Bone } from './types'
import regionsJson from '../../content/regions.json'

// Every bone file is bundled at build time: editing content/bones/*.json needs no code change.
const files = import.meta.glob<Bone>('../../content/bones/*.json', { eager: true, import: 'default' })

export const BONES: Bone[] = Object.values(files).sort((a, b) => a.id.localeCompare(b.id))
export const BONE_BY_ID: ReadonlyMap<string, Bone> = new Map(BONES.map((b) => [b.id, b]))

export const REGIONS = regionsJson.regions
export const GROUPS = regionsJson.groups

export const SIDE_SHORT: Record<Bone['side'], string> = { left: 'L', right: 'R', midline: '' }

/** "Femur (left)", "Sternum". */
export function displayName(b: Bone): string {
  return b.side === 'midline' ? b.name : `${b.name} (${b.side})`
}
