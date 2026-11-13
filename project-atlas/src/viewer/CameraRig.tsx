import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useRef, type ComponentRef, type Ref } from 'react'
import * as THREE from 'three'
import type { CameraView } from '../content/types'

export interface CameraApi {
  getView(): CameraView
}

interface Props {
  view: CameraView
  /** Change to re-run the move to `view` (double-tap reset). */
  resetKey: number
  apiRef?: Ref<CameraApi>
  durationMs?: number
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const round = (v: THREE.Vector3) => v.toArray().map((n) => Math.round(n * 1000) / 1000) as [number, number, number]

/** Orbit controls (drag/pinch) plus smooth camera moves to each question's framing. */
export function CameraRig({ view, resetKey, apiRef, durationMs = 1000 }: Props) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const tween = useRef<{ from: number; p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3 } | null>(null)
  const first = useRef(true)
  const viewKey = JSON.stringify(view)

  useImperativeHandle(apiRef, () => ({
    getView: () => ({ position: round(camera.position), target: round(controls.current?.target ?? new THREE.Vector3()) }),
  }))

  useEffect(() => {
    const v = JSON.parse(viewKey) as CameraView
    const p1 = new THREE.Vector3(...v.position)
    const t1 = new THREE.Vector3(...v.target)
    const c = controls.current
    if (first.current || !c) {
      // Jump straight to the first view.
      first.current = false
      camera.position.copy(p1)
      c?.target.copy(t1)
      c?.update()
      invalidate()
      return
    }
    tween.current = { from: performance.now(), p0: camera.position.clone(), t0: c.target.clone(), p1, t1 }
    invalidate()
  }, [viewKey, resetKey, camera, invalidate])

  useFrame(() => {
    const tw = tween.current
    const c = controls.current
    if (!tw || !c) return
    const raw = Math.min(1, (performance.now() - tw.from) / durationMs)
    const k = easeInOut(raw)
    // Move along an arc around the target rather than cutting through the model.
    const target = tw.t0.clone().lerp(tw.t1, k)
    const d0 = tw.p0.clone().sub(tw.t0)
    const d1 = tw.p1.clone().sub(tw.t1)
    const len = THREE.MathUtils.lerp(d0.length(), d1.length(), k)
    const dir = d0.normalize().lerp(d1.normalize(), k)
    if (dir.lengthSq() < 1e-6) dir.copy(d1).normalize()
    camera.position.copy(target).add(dir.normalize().multiplyScalar(len))
    c.target.copy(target)
    c.enabled = raw >= 1
    c.update()
    if (raw >= 1) tween.current = null
    invalidate()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      enablePan={false}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      minDistance={0.12}
      maxDistance={4}
    />
  )
}
