import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// Bounding-volume hierarchies make raycasts (taps, label occlusion) take microseconds instead of testing every
// triangle. Meshes without one fall back to the normal raycast.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

const idle: (cb: () => void) => void = (cb) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(() => cb(), { timeout: 200 }) : setTimeout(cb, 16)

/** Builds BVHs a few meshes at a time when the browser is idle, so loading never stutters. */
export function buildBvhs(meshes: THREE.Mesh[], perTick = 12) {
  let i = 0
  const step = () => {
    for (let n = 0; n < perTick && i < meshes.length; n++, i++) {
      const g = meshes[i].geometry
      if (!g.boundsTree) g.computeBoundsTree()
    }
    if (i < meshes.length) idle(step)
  }
  idle(step)
}
