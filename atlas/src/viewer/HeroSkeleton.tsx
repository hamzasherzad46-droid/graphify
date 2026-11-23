import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { useModel, MODEL_URL } from './modelUrls'
import { makeMatcap, PALETTES } from './materials'
import type { Sex } from '../data/types'

/**
 * The Home hero: the skeleton turning slowly, lit with a soft teal rim. It reuses the model already loaded for the
 * 3D Atlas (a clone of its meshes, no second download) and renders only while it is on screen.
 */
export default function HeroSkeleton({ theme, sex, active }: { theme: 'dark' | 'light'; sex: Sex; active: boolean }) {
  return (
    <Canvas
      className="hero-canvas"
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ fov: 24, near: 0.05, far: 20, position: [0, 0.9, 5] }}
    >
      <Suspense fallback={null}>
        <Turning theme={theme} sex={sex} />
      </Suspense>
    </Canvas>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Turning({ theme, sex }: { theme: 'dark' | 'light'; sex: Sex }) {
  const { scene } = useModel(MODEL_URL[sex])
  const group = useRef<THREE.Group>(null)
  const model = useMemo(() => {
    const rim: [number, number, number] = theme === 'dark' ? [0.22, 0.95, 0.88] : [0.05, 0.35, 0.33]
    const matcap = makeMatcap(rim)
    const bone = new THREE.MeshMatcapMaterial({ matcap, color: PALETTES[theme].bone })
    const ctx = new THREE.MeshMatcapMaterial({ matcap, color: PALETTES[theme].context })
    const c = scene.clone(true)
    const extra: THREE.Object3D[] = []
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if ((m.parent as THREE.Mesh)?.isMesh) extra.push(m) // selection glow shells
      m.material = m.userData.kind === 'bone' ? bone : ctx
      m.raycast = () => {}
    })
    for (const e of extra) e.removeFromParent()
    // Centre on the body and stand it in the frame.
    const box = new THREE.Box3().setFromObject(c)
    const centre = box.getCenter(new THREE.Vector3())
    c.position.sub(centre)
    return { object: c, height: box.getSize(new THREE.Vector3()).y }
  }, [scene, theme])

  useFrame(({ camera, size }, dt) => {
    const cam = camera as THREE.PerspectiveCamera
    // Fit the whole body to the card's height.
    const dist = (model.height * 0.56) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const want = new THREE.Vector3(0, 0.05, dist / Math.min(1, size.width / size.height / 0.55))
    if (cam.position.distanceTo(want) > 1e-3) {
      cam.position.copy(want)
      cam.lookAt(0, 0, 0)
    }
    if (group.current && !reducedMotion()) group.current.rotation.y += Math.min(dt, 0.05) * 0.35
  })

  return (
    <group ref={group}>
      <primitive object={model.object} />
    </group>
  )
}
