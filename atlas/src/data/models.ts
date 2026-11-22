import type { Sex } from './types'
import male from './model-male.json'
import female from './model-female.json'

interface MeshInfo {
  kind: string
  origin?: 'scan' | 'derived'
  approximate?: boolean
}

const MANIFESTS: Record<Sex, Record<string, MeshInfo>> = {
  male: male.meshes as Record<string, MeshInfo>,
  female: female.meshes as Record<string, MeshInfo>,
}

export function meshInfo(sex: Sex, id: string): MeshInfo | undefined {
  return MANIFESTS[sex][id]
}

/** Where this bone's 3D shape comes from, in plain words. */
export function modelSource(sex: Sex, id: string): string {
  const m = MANIFESTS[sex][id]
  if (sex === 'male') return 'Z-Anatomy adult male (based on BodyParts3D)'
  if (m?.origin === 'scan') return 'CT-based scan of a female donor (Visible Human Female)'
  return 'Adapted from the male model, fitted to the female skeleton'
}
