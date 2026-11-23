import { Suspense, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useModel, MODEL_URL } from './modelUrls'
import { createMaterials } from './materials'
import type { Sex } from '../data/types'

/**
 * "Label this": one bone lit on the model, with its neighbours dimmed for context, in a small canvas of its own. It
 * reuses the model already loaded for the 3D Atlas (a clone, no second download). It turns slowly and can be turned
 * by dragging; no labels are shown, since naming the bone is the question.
 */
export default function BoneSnapshot({ bone, theme, sex, elevation = 14 }: { bone: string; theme: 'dark' | 'light'; sex: Sex; elevation?: number }) {
  return (
    <Canvas className="snapshot-canvas" dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} camera={{ fov: 30, near: 0.001, far: 10 }}>
      <Suspense fallback={null}>
        <Scene bone={bone} theme={theme} sex={sex} elevation={elevation} />
      </Suspense>
    </Canvas>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Scene({ bone, theme, sex, elevation }: { bone: string; theme: 'dark' | 'light'; sex: Sex; elevation: number }) {
  const { scene } = useModel(MODEL_URL[sex])
  const view = useMemo(() => {
    const mats = createMaterials(theme)
    const c = scene.clone(true)
    c.updateMatrixWorld(true)
    let target: THREE.Mesh | null = null
    const meshes: THREE.Mesh[] = []
    const extra: THREE.Object3D[] = []
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if ((m.parent as THREE.Mesh)?.isMesh) extra.push(m) // selection glow shells
      else meshes.push(m)
      if (m.name === bone && m.userData.kind === 'bone') target = m
    })
    for (const e of extra) e.removeFromParent()
    const box = new THREE.Box3()
    if (target) box.setFromObject(target)
    const centre = box.getCenter(new THREE.Vector3())
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.01)
    // Context: bones near the target, dimmed; everything further away is hidden (clearer, and cheaper to draw).
    const near = new THREE.Box3()
    for (const m of meshes) {
      near.setFromObject(m)
      const d = near.distanceToPoint(centre)
      m.visible = m === target || d < radius * 1.6
      m.material = m === target ? mats.selected : mats.dim
      m.raycast = () => {}
    }
    c.position.sub(centre)
    const glow = target ? new THREE.Mesh((target as THREE.Mesh).geometry, mats.glow) : null
    if (glow && target) {
      mats.glow.uniforms.uPush.value = THREE.MathUtils.clamp(radius * 0.02, 0.00004, 0.0025)
      ;(target as THREE.Mesh).add(glow)
    }
    // Seen from the front (outward for bones away from the midline), from `elevation` degrees above.
    const flat = new THREE.Vector3(Math.sign(centre.x) * 0.6, 0, 1).normalize()
    const el = THREE.MathUtils.degToRad(elevation)
    const dir = flat.multiplyScalar(Math.cos(el)).setY(Math.sin(el)).normalize()
    return { object: c, radius, dir }
  }, [scene, bone, theme, elevation])

  const pos = useMemo(() => view.dir.clone().multiplyScalar((view.radius / Math.sin(THREE.MathUtils.degToRad(30) / 2)) * 1.05), [view])
  return (
    <>
      <primitive object={view.object} />
      <PerspectiveSetup position={pos} />
      <OrbitControls makeDefault enablePan={false} enableZoom={false} autoRotate={!reducedMotion()} autoRotateSpeed={0.9} enableDamping dampingFactor={0.12} rotateSpeed={0.7} />
    </>
  )
}

/** Put the camera at the framing position (once per bone), looking at the bone; the controls take over from there. */
function PerspectiveSetup({ position }: { position: THREE.Vector3 }) {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    camera.position.copy(position)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, position])
  return null
}
