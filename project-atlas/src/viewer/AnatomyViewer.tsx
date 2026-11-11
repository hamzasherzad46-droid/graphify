import { Canvas, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import * as THREE from 'three'
import type { CameraView, Structure } from '../content/types'
import type { ModuleAssets } from '../content/useModule'
import { meshKeys } from '../lib/meshMatch'
import { CameraRig, type CameraApi } from './CameraRig'
import { ModelInstance } from './ModelInstance'
import './viewer.css'

export interface AnatomyViewerProps {
  assets: ModuleAssets
  highlight: string[]
  view: CameraView
  /** Questions either side, shown as blurred ghost models (quiz carousel). */
  ghosts?: { prev?: Structure; next?: Structure; index: number }
  onPick?: (meshName: string) => void
  cameraApi?: Ref<CameraApi>
}

const DPR: [number, number] = [1, 2] // cap pixel ratio at 2 for mobile GPUs

/** Soft studio lighting: a procedural room environment (no HDR download) plus a key and a rim light. */
function Lights() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.35
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return (
    <>
      <hemisphereLight args={['#fff8ee', '#1d1d22', 0.45]} />
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.35} color="#fff6e8" />
      <directionalLight position={[-2.5, 1.5, -2]} intensity={0.8} color="#dfe8ff" />
    </>
  )
}

export default function AnatomyViewer({ assets, highlight, view, ghosts, onPick, cameraApi }: AnatomyViewerProps) {
  const [resetKey, setResetKey] = useState(0)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })

  // Double-tap (touch) or double-click (mouse) resets the view.
  const onPointerUp = (e: ReactPointerEvent) => {
    const now = performance.now()
    const l = lastTap.current
    const near = Math.hypot(e.clientX - l.x, e.clientY - l.y) < 30
    if (now - l.t < 320 && near) {
      setResetKey((k) => k + 1)
      lastTap.current = { t: 0, x: 0, y: 0 }
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    }
  }

  return (
    <div className="viewer" onPointerUp={onPointerUp}>
      {ghosts && <GhostCarousel assets={assets} {...ghosts} />}
      <Canvas
        className="viewer-main"
        dpr={DPR}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 35, near: 0.01, far: 50, position: view.position }}
      >
        <Lights />
        <Suspense fallback={null}>
          <ModelInstance assets={assets} highlight={highlight} onPick={onPick} />
        </Suspense>
        <CameraRig view={view} resetKey={resetKey} apiRef={cameraApi} />
      </Canvas>
    </div>
  )
}

/* ---------- Ghost carousel ---------- */

const GHOST_SLOT_X = 1.0
const GHOST_HEIGHT = 0.85

/**
 * Previous/next questions, drawn in a separate low-resolution canvas that only
 * renders when the question changes. CSS blurs and fades it, so it is cheap.
 */
function GhostCarousel({ assets, prev, next, index }: { assets: ModuleAssets; prev?: Structure; next?: Structure; index: number }) {
  const el = useRef<HTMLDivElement>(null)
  // Slide in on every question change without remounting the canvas (no new WebGL context).
  useEffect(() => {
    el.current?.animate(
      [
        { opacity: 0, transform: 'translateX(12%)' },
        { opacity: 0.38, transform: 'none' },
      ],
      { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
  }, [index])
  return (
    <div className="viewer-ghosts" ref={el} aria-hidden>
      <Canvas dpr={0.5} frameloop="demand" gl={{ antialias: false, alpha: true }} camera={{ fov: 30, position: [0, 0, 4] }}>
        <Lights />
        <Suspense fallback={null}>
          {prev && <Ghost assets={assets} structure={prev} slot={-GHOST_SLOT_X} />}
          {next && <Ghost assets={assets} structure={next} slot={GHOST_SLOT_X} />}
        </Suspense>
      </Canvas>
    </div>
  )
}

/** Places a whole model so the structure's own camera framing appears in the slot. */
function Ghost({ assets, structure, slot }: { assets: ModuleAssets; structure: Structure; slot: number }) {
  const { position, target } = structure.camera
  const dir = new THREE.Vector3(...position).sub(new THREE.Vector3(...target))
  const scale = GHOST_HEIGHT / (0.63 * dir.length()) // 0.63 ≈ 2·tan(35°/2), the main camera's view height per metre
  const yaw = Math.atan2(dir.x, dir.z)
  const rotated = new THREE.Vector3(...target).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw).multiplyScalar(scale)
  return (
    <group position={[slot - rotated.x, -rotated.y, -rotated.z]} rotation={[0, -yaw, 0]} scale={scale}>
      <ModelInstance assets={assets} highlight={meshKeys(structure.meshName)} glow={false} />
    </group>
  )
}
