import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useViewer, type ViewName } from '../state/store'
import { useHud, INSETS } from '../state/hud'
import { registry } from './registry'

const DIRS: Record<ViewName, THREE.Vector3> = {
  anterior: new THREE.Vector3(0, 0, 1),
  posterior: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(1, 0, 0), // the body's left is +X
  right: new THREE.Vector3(-1, 0, 0),
  superior: new THREE.Vector3(0, 1, 0.002).normalize(),
  inferior: new THREE.Vector3(0, -1, 0.002).normalize(),
}
const NAMES: Record<ViewName, string> = {
  anterior: 'Anterior',
  posterior: 'Posterior',
  left: 'Left lateral',
  right: 'Right lateral',
  superior: 'Superior',
  inferior: 'Inferior',
}

interface Tween {
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  fromDir: THREE.Vector3
  toDir: THREE.Vector3
  fromDist: number
  toDist: number
  t0: number
  dur: number
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<OrbitControlsImpl>(null)
  const tween = useRef<Tween | null>(null)
  const command = useViewer((s) => s.camera)
  const loaded = useViewer((s) => s.loaded)
  const home = useRef<{ center: THREE.Vector3; size: THREE.Vector3 } | null>(null)

  /** Distance that fits a sphere of `radius` inside the free screen area (between the overlays). */
  const fitDistance = (radius: number, bottomInset: number) => fitBox(radius, radius, bottomInset) + radius * 0.5

  /** Distance at which a half-width × half-height extent fits the free screen area, with a small margin. */
  const fitBox = (halfW: number, halfH: number, bottomInset: number) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const freeFrac = Math.max(0.35, (size.height - INSETS.top - bottomInset) / size.height)
    const tanH = tanV * camera.aspect
    return Math.max(halfH / (tanV * freeFrac), halfW / (tanH * 0.9)) * 1.06
  }

  /** Orbit target that puts `point` in the middle of the free screen area. */
  const framedTarget = (point: THREE.Vector3, dir: THREE.Vector3, dist: number, bottomInset: number) => {
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const shiftPx = (INSETS.top - bottomInset) / 2
    const shift = (shiftPx / size.height) * 2 * dist * Math.tan(vFov / 2)
    const right = new THREE.Vector3().crossVectors(camera.up, dir)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    const up = new THREE.Vector3().crossVectors(dir, right.normalize()).normalize()
    return point.clone().addScaledVector(up, shift)
  }

  const flyTo = (target: THREE.Vector3, dir: THREE.Vector3, dist: number, dur = 750) => {
    const c = controls.current
    if (!c) return
    const offset = camera.position.clone().sub(c.target)
    tween.current = {
      fromTarget: c.target.clone(),
      toTarget: target,
      fromDir: offset.clone().normalize(),
      toDir: dir.clone().normalize(),
      fromDist: offset.length(),
      toDist: dist,
      t0: performance.now(),
      dur,
    }
    invalidate()
  }

  const homeView = (dir = DIRS.anterior) => {
    const h = home.current!
    // Project the model's box onto the screen axes for this view direction.
    const half = h.size.clone().multiplyScalar(0.5)
    const right = new THREE.Vector3().crossVectors(camera.up, dir)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    right.normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    const extent = (axis: THREE.Vector3) => Math.abs(axis.x) * half.x + Math.abs(axis.y) * half.y + Math.abs(axis.z) * half.z
    const dist = fitBox(extent(right), extent(up), INSETS.bottom) + extent(dir)
    return { target: framedTarget(h.center, dir, dist, INSETS.bottom), dir, dist }
  }

  // First frame after loading: frame the whole skeleton.
  useEffect(() => {
    if (!loaded || !registry.root || !controls.current) return
    const box = new THREE.Box3().setFromObject(registry.root)
    home.current = { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) }
    const { target, dir, dist } = homeView()
    controls.current.target.copy(target)
    camera.position.copy(target).addScaledVector(dir, dist)
    controls.current.update()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Camera commands from the UI.
  useEffect(() => {
    const c = controls.current
    if (!command || !c || !home.current) return
    const bottom = useViewer.getState().selectedId ? INSETS.panel : INSETS.bottom
    if (command.kind === 'reset') {
      const v = homeView()
      flyTo(v.target, v.dir, v.dist, 900)
    } else if (command.kind === 'view') {
      // Keep what you are looking at; turn the camera to the preset direction.
      const dir = DIRS[command.view]
      const sel = useViewer.getState().selectedId
      const m = sel ? registry.bones.get(sel) : null
      if (m) {
        const p = m.getWorldPosition(new THREE.Vector3())
        const dist = camera.position.distanceTo(c.target)
        flyTo(framedTarget(p, dir, dist, bottom), dir, dist)
      } else {
        const v = homeView(dir)
        flyTo(v.target, dir, v.dist)
      }
    } else if (command.kind === 'focus') {
      const m = registry.bones.get(command.id)
      if (!m) return
      const p = m.getWorldPosition(new THREE.Vector3())
      const r = registry.radius.get(command.id) ?? 0.05
      const dir = camera.position.clone().sub(c.target).normalize()
      // Show the bone with its neighbours; an isolated bone fills the view.
      const dist = command.tight ? Math.max(fitDistance(r * 1.15, bottom), 0.02) : fitDistance(Math.max(r * 2.2, 0.04), bottom)
      flyTo(framedTarget(p, dir, dist, bottom), dir, dist)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  // A touch or drag cancels a running flight.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const cancel = () => (tween.current = null)
    c.addEventListener('start', cancel)
    return () => c.removeEventListener('start', cancel)
  }, [])

  // HUD orientation readout.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    let raf = 0
    const update = () => {
      raf = 0
      const d = camera.position.clone().sub(c.target).normalize()
      let best: ViewName = 'anterior'
      let bestDot = -2
      for (const [k, v] of Object.entries(DIRS) as [ViewName, THREE.Vector3][]) {
        const dt = d.dot(v)
        if (dt > bestDot) {
          bestDot = dt
          best = k
        }
      }
      const az = (THREE.MathUtils.radToDeg(Math.atan2(d.x, d.z)) + 360) % 360
      const el = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)))
      useHud.setState({ orientation: bestDot > 0.82 ? NAMES[best] : 'Oblique', azimuth: Math.round(az), elevation: Math.round(el) })
    }
    const onChange = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    c.addEventListener('change', onChange)
    return () => {
      c.removeEventListener('change', onChange)
      cancelAnimationFrame(raf)
    }
  }, [camera])

  useFrame(() => {
    const t = tween.current
    const c = controls.current
    if (!t || !c) return
    const k = Math.min(1, (performance.now() - t.t0) / t.dur)
    const e = ease(k)
    c.target.lerpVectors(t.fromTarget, t.toTarget, e)
    // Swing around the target (slerp of the view direction) instead of cutting through the body.
    const q = new THREE.Quaternion().setFromUnitVectors(t.fromDir, t.toDir)
    const dir = t.fromDir.clone().applyQuaternion(new THREE.Quaternion().slerp(q, e))
    const dist = THREE.MathUtils.lerp(t.fromDist, t.toDist, e)
    camera.position.copy(c.target).addScaledVector(dir, dist)
    c.update()
    if (k >= 1) tween.current = null
    invalidate()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.75}
      zoomSpeed={0.9}
      panSpeed={0.9}
      minDistance={0.03}
      maxDistance={8}
      zoomToCursor
    />
  )
}
