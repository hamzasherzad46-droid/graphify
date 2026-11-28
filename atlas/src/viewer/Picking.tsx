import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { registry } from './registry'
import { dragState } from './dragState'
import { labelAt } from './labelDom'

const TAP_MOVE = 8 // px
const TAP_TIME = 450 // ms
const DOUBLE_TAP = 320 // ms
const HOLD = 300 // ms: press and hold a bone, then drag it

interface Controls {
  enabled: boolean
}

/**
 * Tap selects a bone (empty space clears), double-tap flies to it, press-and-hold then drag pulls a bone out.
 * One raycast per tap or hold; none while the finger moves (except along the drag plane).
 */
export function Picking() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as Controls | null

  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pointers = new Set<number>()
    let down: { x: number; y: number; t: number; multi: boolean; moved: boolean } | null = null
    let last = { t: 0, x: 0, y: 0, id: null as string | null }
    let drag: { id: string; plane: THREE.Plane; start: THREE.Vector3; base: [number, number, number] } | null = null

    const setRay = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
    }
    const pick = (x: number, y: number): { id: string; point: THREE.Vector3; part: boolean } | null => {
      setRay(x, y)
      const objects = [...registry.bones.values()].filter((m) => m.visible)
      // Soft parts on show (muscles, organs) are picked too, except in a study session. A bone hidden behind them
      // cannot be pulled out (press and hold picks what is in front).
      if (!useViewer.getState().studying) for (const m of registry.parts.values()) if (m.visible && m.parent?.visible !== false) objects.push(m)
      const hit = ray.intersectObjects(objects, false)[0]
      return hit ? { id: hit.object.name, point: hit.point, part: registry.parts.get(hit.object.name) === hit.object } : null
    }

    const startDrag = (x: number, y: number) => {
      const hit = pick(x, y)
      if (!hit || hit.part) return
      const normal = camera.getWorldDirection(new THREE.Vector3())
      drag = {
        id: hit.id,
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
        start: hit.point.clone(),
        base: useViewer.getState().dragged[hit.id] ?? [0, 0, 0],
      }
      dragState.id = hit.id
      if (controls) controls.enabled = false
      useViewer.getState().select(hit.id)
      navigator.vibrate?.(12)
    }
    const endDrag = () => {
      drag = null
      dragState.id = null
      if (controls) controls.enabled = true
    }

    // Press-and-hold is decided from the events' own timestamps (when the finger really moved), not a timer: on a
    // busy device a quick drag's first move can be handled late, and a timer would mistake it for a hold.
    const onDown = (e: PointerEvent) => {
      pointers.add(e.pointerId)
      if (pointers.size > 1) {
        if (down) down.multi = true
        return
      }
      down = { x: e.clientX, y: e.clientY, t: e.timeStamp, multi: false, moved: false }
    }
    const onMove = (e: PointerEvent) => {
      if (drag) {
        setRay(e.clientX, e.clientY)
        const p = ray.ray.intersectPlane(drag.plane, new THREE.Vector3())
        if (p) {
          const d = p.sub(drag.start)
          useViewer.getState().setDragged(drag.id, [drag.base[0] + d.x, drag.base[1] + d.y, drag.base[2] + d.z])
        }
        return
      }
      if (down && !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_MOVE) {
        down.moved = true
        // Held still for HOLD ms before moving: pull the bone out instead of turning the model.
        if (!down.multi && e.timeStamp - down.t >= HOLD && !useViewer.getState().studying) {
          startDrag(down.x, down.y)
          if (drag) onMove(e)
        }
      }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (drag) {
        if (pointers.size === 0) endDrag()
        down = null
        return
      }
      const d = down
      if (!d || pointers.size > 0) return
      down = null
      if (d.multi || d.moved || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_MOVE || e.timeStamp - d.t > TAP_TIME) return
      const s0 = useViewer.getState()
      if (!s0.studying) {
        const lab = labelAt(e.clientX, e.clientY)
        if (lab) {
          if (lab.group) s0.frameCluster(lab.id)
          else s0.select(lab.id, { focus: true })
          return
        }
      }
      const hit = pick(e.clientX, e.clientY)
      if (hit?.part) {
        // A muscle or organ: select it (double-tap flies to it).
        const now = performance.now()
        const twice = now - last.t < DOUBLE_TAP && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30 && last.id === hit.id
        useViewer.getState().selectPart(hit.id, { focus: twice })
        last = twice ? { t: 0, x: 0, y: 0, id: null } : { t: now, x: e.clientX, y: e.clientY, id: hit.id }
        return
      }
      const id = hit?.id ?? null
      const now = performance.now()
      const isDouble = now - last.t < DOUBLE_TAP && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30
      const s = useViewer.getState()
      if (s.studying) {
        s.onTap?.(id)
        return
      }
      if (isDouble && id && id === last.id) {
        s.select(id, { focus: true })
        last = { t: 0, x: 0, y: 0, id: null }
        return
      }
      s.select(id)
      if (!id) s.selectPart(null)
      last = { t: now, x: e.clientX, y: e.clientY, id }
    }
    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      down = null
      if (drag) endDrag()
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, true) // capture: runs before the orbit controls see the move
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove, true)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      endDrag()
    }
  }, [gl, camera, controls])

  return null
}
