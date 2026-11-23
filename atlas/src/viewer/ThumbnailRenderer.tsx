import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { registry } from './registry'
import { thumbSlots, type ThumbView } from './thumbSlots'
import { BONE_BY_ID } from '../data/bones'

const BG = { dark: new THREE.Color('#0b1316'), light: new THREE.Color('#dbe3e4') }
const SWING = THREE.MathUtils.degToRad(32) // each side view turns gently back and forth by ±32°
const PERIOD = 9 // seconds per swing
const FPS = 30

/**
 * Draws the main view, then the highlighted bone from two other angles (lateral, from the bone's own side, and
 * posterior) into the quiz's side-view boxes. Each side view orbits the bone slowly. Its near plane is set just
 * in front of the bone, so bones between the camera and the target are cut away and deep bones (sphenoid,
 * ossicles, conchae) stay visible. Mounted only while the side views are shown; while mounted it owns rendering
 * (useFrame priority 1) and keeps a 30 fps loop for the rotation.
 */
export function ThumbnailRenderer({ target, theme }: { target: string; theme: 'dark' | 'light' }) {
  const invalidate = useThree((s) => s.invalidate)
  const cams = useMemo(() => ({ lateral: new THREE.PerspectiveCamera(30, 1, 0.001, 10), posterior: new THREE.PerspectiveCamera(30, 1, 0.001, 10) }), [])

  // Animation loop for the slow rotation (the canvas otherwise renders on demand).
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last >= 1000 / FPS - 2) {
        last = t
        invalidate()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [invalidate])

  const center = useMemo(() => new THREE.Vector3(), [])
  const sphere = useMemo(() => new THREE.Sphere(), [])
  const clear = useMemo(() => new THREE.Color(), [])
  const vp = useMemo(() => new THREE.Vector4(), [])

  useFrame(({ gl, scene, camera, size, clock }) => {
    gl.autoClear = true
    gl.setScissorTest(false)
    gl.render(scene, camera)

    const mesh = registry.bones.get(target)
    if (!mesh || !mesh.visible) return
    // Bounding sphere computed once at load (Skeleton); here only moved into world space.
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld)
    center.copy(sphere.center)
    const r = Math.max(sphere.radius, 0.004)
    const bone = BONE_BY_ID.get(target)
    // Lateral from the bone's own side (the body's left is +X); midline bones from the left.
    const sideX = bone?.side === 'right' ? -1 : bone?.side === 'left' ? 1 : center.x < -0.005 ? -1 : 1
    const base: Record<ThumbView, number> = { lateral: sideX > 0 ? Math.PI / 2 : -Math.PI / 2, posterior: Math.PI }
    const canvasRect = gl.domElement.getBoundingClientRect()
    const prevAlpha = gl.getClearAlpha()
    gl.getClearColor(clear)
    const prevColor = clear.clone()
    const t = clock.elapsedTime

    for (const view of ['lateral', 'posterior'] as const) {
      const el = thumbSlots[view]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      if (w < 8 || h < 8) continue
      const x = Math.round(rect.left - canvasRect.left)
      const y = Math.round(size.height - (rect.bottom - canvasRect.top))
      const cam = cams[view]
      cam.aspect = w / h
      const fit = r / Math.sin(THREE.MathUtils.degToRad(cam.fov) / 2)
      const dist = Math.max(fit / Math.min(1, cam.aspect), fit) * 1.12
      // Each view swings in opposite phase, so the two never look alike.
      const az = base[view] + Math.sin(((t / PERIOD) * 2 + (view === 'lateral' ? 0 : 1)) * Math.PI) * SWING
      const el0 = THREE.MathUtils.degToRad(14)
      cam.position.set(center.x + Math.sin(az) * Math.cos(el0) * dist, center.y + Math.sin(el0) * dist, center.z + Math.cos(az) * Math.cos(el0) * dist)
      cam.up.set(0, 1, 0)
      cam.lookAt(center)
      cam.near = Math.max(0.0005, dist - r * 1.15)
      cam.far = dist + r * 8
      cam.updateProjectionMatrix()

      vp.set(x, y, w, h)
      gl.setViewport(vp)
      gl.setScissor(vp)
      gl.setScissorTest(true)
      gl.setClearColor(BG[theme], 1)
      gl.render(scene, cam)
    }
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    gl.setClearColor(prevColor, prevAlpha)
  }, 1)

  return null
}
