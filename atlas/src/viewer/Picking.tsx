import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { registry } from './registry'

const TAP_MOVE = 8 // px
const TAP_TIME = 450 // ms
const DOUBLE_TAP = 320 // ms

/** Tap selects a bone (empty space clears), double-tap flies to it. One raycast per tap, none on move. */
export function Picking() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pointers = new Set<number>()
    let down: { x: number; y: number; t: number; multi: boolean } | null = null
    let last = { t: 0, x: 0, y: 0, id: null as string | null }

    const pick = (x: number, y: number): string | null => {
      const r = el.getBoundingClientRect()
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const objects = [...registry.bones.values()].filter((m) => m.visible)
      const hit = ray.intersectObjects(objects, false)[0]
      return hit ? hit.object.name : null
    }

    const onDown = (e: PointerEvent) => {
      pointers.add(e.pointerId)
      if (pointers.size > 1) {
        if (down) down.multi = true
        return
      }
      down = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false }
    }
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      const d = down
      if (!d || pointers.size > 0) return
      down = null
      if (d.multi || Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_MOVE || performance.now() - d.t > TAP_TIME) return
      const id = pick(e.clientX, e.clientY)
      const now = performance.now()
      const isDouble = now - last.t < DOUBLE_TAP && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30
      const s = useViewer.getState()
      if (isDouble && id && id === last.id) {
        s.select(id, { focus: true })
        last = { t: 0, x: 0, y: 0, id: null }
        return
      }
      s.select(id)
      last = { t: now, x: e.clientX, y: e.clientY, id }
    }
    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      down = null
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [gl, camera])

  return null
}
