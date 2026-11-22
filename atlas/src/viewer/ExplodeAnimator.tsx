import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { useHud } from '../state/hud'
import { registry } from './registry'
import { computeExplode, targetPosition } from './explode'
import { dragState } from './dragState'

/**
 * Moves bones towards where the exploded view and hand-dragging put them, easing each frame (frames are only
 * rendered while something moves). Context meshes follow their host bone.
 */
export function ExplodeAnimator() {
  const invalidate = useThree((s) => s.invalidate)
  const loaded = useViewer((s) => s.loaded)
  const settled = useRef(true)
  const v = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!loaded) return
    computeExplode()
    settled.current = false
    invalidate()
  }, [loaded, invalidate])

  useEffect(
    () =>
      useViewer.subscribe((s, p) => {
        if (s.explodeAmount !== p.explodeAmount || s.explodeGroup !== p.explodeGroup || s.dragged !== p.dragged) {
          settled.current = false
          invalidate()
        }
      }),
    [invalidate],
  )

  useFrame((_, dt) => {
    if (settled.current || !useViewer.getState().loaded) return
    const s = useViewer.getState()
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 9)
    let moving = false
    for (const [id, m] of registry.bones) {
      if (!registry.rest.has(id)) continue
      targetPosition(id, s.explodeGroup, s.explodeAmount, s.dragged, v.current)
      if (id === dragState.id || m.position.distanceToSquared(v.current) < 1e-10) {
        m.position.copy(v.current)
        continue
      }
      m.position.lerp(v.current, k)
      moving = true
    }
    for (const m of registry.context) {
      const host = registry.host.get(m)
      const hm = host ? registry.bones.get(host) : null
      const rest = registry.contextRest.get(m)
      const hostRest = host ? registry.rest.get(host) : null
      if (hm && rest && hostRest) m.position.copy(rest).add(hm.position).sub(hostRest)
    }
    if (moving) invalidate()
    else {
      settled.current = true
      useHud.setState((h) => ({ bonesVersion: h.bonesVersion + 1 }))
    }
  })

  return null
}
