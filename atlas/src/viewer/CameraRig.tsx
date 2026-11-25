import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useViewer, type ViewName } from '../state/store'
import { useHud, INSETS, topInset } from '../state/hud'
import { registry } from './registry'
import { BONES, BONE_BY_ID } from '../data/bones'

/** Top of the free screen area: below the header, explode bar or study prompt. */
const topNow = () => (useViewer.getState().studying ? useHud.getState().studyInsets.top : topInset(useViewer.getState().explodeOpen))
const bottomNow = () => (useViewer.getState().studying ? useHud.getState().studyInsets.bottom : useViewer.getState().selectedId ? INSETS.panel : INSETS.bottom)

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
  const first = useRef(true)

  /** Distance that fits a sphere of `radius` inside the free screen area (between the overlays). */
  const fitDistance = (radius: number, bottomInset: number) => fitBox(radius, radius, bottomInset) + radius * 0.5

  /** Distance at which a half-width × half-height extent fits the free screen area, with a small margin. */
  const fitBox = (halfW: number, halfH: number, bottomInset: number) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const freeFrac = Math.max(0.35, (size.height - topNow() - bottomInset) / size.height)
    const tanH = tanV * camera.aspect
    const side = useViewer.getState().studying ? (useHud.getState().studyInsets.side ?? 0) : 0
    const freeW = Math.max(0.4, (size.width - 2 * side) / size.width) * 0.9
    return Math.max(halfH / (tanV * freeFrac), halfW / (tanH * freeW)) * 1.06
  }

  /** Orbit target that puts `point` in the middle of the free screen area. */
  const framedTarget = (point: THREE.Vector3, dir: THREE.Vector3, dist: number, bottomInset: number) => {
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const shiftPx = (topNow() - bottomInset) / 2
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

  /** The box round the bones on show: the region view's bones, or the whole skeleton (as it is now). */
  const shownBox = () => {
    const ids = useViewer.getState().regionIds
    const box = new THREE.Box3()
    if (ids) for (const id of ids) {
      const m = registry.bones.get(id)
      if (m) box.expandByObject(m)
    }
    return box.isEmpty() ? new THREE.Box3().setFromObject(registry.root!) : box
  }

  /** The view a region is best seen from: the foot from above and in front, the rest from the front. */
  const regionDir = () => {
    const r = useViewer.getState().region
    return r === 'foot' ? new THREE.Vector3(0, 1, 0.55).normalize() : r === 'all' ? DIRS.anterior : new THREE.Vector3(0.28, 0.12, 1).normalize()
  }

  const homeView = (dir = DIRS.anterior, box?: THREE.Box3) => {
    const h = box ? { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) } : home.current!
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
    const sel = useViewer.getState().selectedId
    if (sel && home.current && camera.position.lengthSq() > 0 && first.current === false) {
      // Switching skeletons keeps the selected bone in view.
      useViewer.getState().focus(sel)
      return
    }
    first.current = false
    const region = useViewer.getState().regionIds ? shownBox() : undefined
    const { target, dir, dist } = homeView(region ? regionDir() : DIRS.anterior, region)
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
    const bottom = bottomNow()
    if (command.kind === 'reset' || command.kind === 'fit') {
      // Frame the skeleton as it is now (exploded or not), or the region on show.
      const box = new THREE.Box3().setFromObject(registry.root!)
      home.current = { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) }
      const region = useViewer.getState().regionIds && !useViewer.getState().studying
      const v = region ? homeView(regionDir(), shownBox()) : homeView()
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
        const v = homeView(dir, useViewer.getState().regionIds ? shownBox() : undefined)
        flyTo(v.target, dir, v.dist)
      }
    } else if (command.kind === 'frame') {
      // Study: show the bone with its neighbours (its cluster), from the side it is best seen.
      const m = registry.bones.get(command.id)
      const b = BONE_BY_ID.get(command.id)
      if (!m || !b) return
      let p = m.getWorldPosition(new THREE.Vector3())
      const v = new THREE.Vector3()
      // Neighbours: the bone's cluster (same subregion and side), or its whole region for "tap the bone".
      const near = BONES.filter((x) => x.region === b.region && x.side === b.side && (command.region || (x.subregion ?? '') === (b.subregion ?? '')))
      if (command.region) {
        const c = new THREE.Vector3()
        let k = 0
        for (const x of near) {
          const mm = registry.bones.get(x.id)
          if (mm) {
            c.add(mm.getWorldPosition(v))
            k++
          }
        }
        if (k) p = c.divideScalar(k)
      }
      let R = (registry.radius.get(command.id) ?? 0.03) * 2.5
      for (const x of near) {
        const mm = registry.bones.get(x.id)
        if (mm) R = Math.max(R, (mm.getWorldPosition(v).distanceTo(p) + (registry.radius.get(x.id) ?? 0) * 0.6) * (command.region ? 1 : 0.8))
      }
      R = THREE.MathUtils.clamp(R, 0.045, command.region ? 0.6 : 0.4)
      // Outward from the body's vertical axis, leaning anterior and a little from above.
      const axis = home.current.center
      const out = new THREE.Vector3(p.x - axis.x, 0, p.z - axis.z)
      const dir = (out.lengthSq() > 1e-4 ? out.normalize() : new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0.5)).normalize()
      if (command.close) {
        // Close (Spelling Quiz): the bone itself fills the free area. Fit its outline as seen from `dir` (the
        // corners of its box on the screen axes), not its bounding sphere, so long thin bones seen end-on
        // (the conchae, ribs from the front) still fill the view.
        const box = new THREE.Box3().setFromObject(m)
        const c = box.getCenter(new THREE.Vector3())
        const right = new THREE.Vector3().crossVectors(camera.up, dir)
        if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
        right.normalize()
        const up = new THREE.Vector3().crossVectors(dir, right).normalize()
        let hw = 0
        let hh = 0
        let hd = 0
        for (let k = 0; k < 8; k++) {
          v.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).sub(c)
          hw = Math.max(hw, Math.abs(v.dot(right)))
          hh = Math.max(hh, Math.abs(v.dot(up)))
          hd = Math.max(hd, Math.abs(v.dot(dir)))
        }
        const pad = 1.18
        const dist = Math.max(fitBox(Math.max(hw, 0.003) * pad, Math.max(hh, 0.003) * pad, bottom) + hd, 0.02)
        flyTo(framedTarget(c, dir, dist, bottom), dir, dist, 650)
        return
      }
      const dist = fitDistance(R, bottom)
      flyTo(framedTarget(p, dir, dist, bottom), dir, dist, 650)
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

  // Development only: expose the controls for automated tests (exact rotations).
  useEffect(() => {
    if (import.meta.env.DEV && controls.current) Object.assign((window as unknown as { __atlas?: object }).__atlas ?? {}, { controls: controls.current, invalidate })
  })

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
      minDistance={0.012}
      maxDistance={8}
      zoomToCursor
    />
  )
}
