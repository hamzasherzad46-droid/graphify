import type { Group, Mesh, Vector3 } from 'three'

/**
 * Handles to the loaded skeleton, shared by the 3D components (picking, camera, labels).
 * Positions are each node's rest position; later steps (exploded view, drag) offset from these.
 */
export const registry = {
  root: null as Group | null,
  bones: new Map<string, Mesh>(),
  context: [] as Mesh[],
  /** Context mesh → the bone it moves and hides with. */
  host: new Map<Mesh, string>(),
  contextRest: new Map<Mesh, Vector3>(),
  rest: new Map<string, Vector3>(),
  radius: new Map<string, number>(),
}

/** Per bone: a surface point near its centre, in the bone's local space (label anchor). */
export const anchors = new Map<string, Vector3>()

export function boneCenter(id: string, target: Vector3): Vector3 | null {
  const m = registry.bones.get(id)
  if (!m) return null
  return m.getWorldPosition(target)
}
