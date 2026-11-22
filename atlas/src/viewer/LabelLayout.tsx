import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { useHud, INSETS, topInset, type LabelItem } from '../state/hud'
import { BONE_BY_ID } from '../data/bones'
import { registry, anchors } from './registry'

const ROW = 24 // px per label row
const MAX_PER_SIDE = 8 // calm, readable: the biggest bones on screen win
const MIN_RADIUS_PX = 16 // bones smaller than this on screen are not labelled
const EDGE = 10
const FONT = '500 11.5px "Inter Variable", Inter, system-ui, sans-serif'

let measureCtx: CanvasRenderingContext2D | null = null
function textWidth(s: string) {
  measureCtx ??= document.createElement('canvas').getContext('2d')!
  measureCtx.font = FONT
  return Math.ceil(measureCtx.measureText(s).width)
}

/**
 * Places labels in two columns at the screen edges, ordered by the height of their bone and
 * spread so they never overlap, with a leader line to a point on the bone. Recomputed when
 * the camera comes to rest (labels fade out while it moves).
 */
function layout(camera: THREE.PerspectiveCamera, W: number, H: number): LabelItem[] {
  const { selectedId, ghost, explodeOpen } = useViewer.getState()
  const top = topInset(explodeOpen) + 6
  const bottom = H - (selectedId ? INSETS.panel : INSETS.bottom) - 6
  const capacity = Math.min(MAX_PER_SIDE, Math.max(0, Math.floor((bottom - top) / ROW)))
  if (capacity === 0) return []

  const visible = [...registry.bones.values()].filter((m) => m.visible)
  const ray = new THREE.Raycaster()
  const p = new THREE.Vector3()
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
  type Cand = { id: string; sx: number; sy: number; rpx: number; selected: boolean; world: THREE.Vector3 }
  const cands: Cand[] = []
  for (const m of visible) {
    const id = m.name
    const selected = id === selectedId
    if (ghost && selectedId && !selected) continue
    const a = anchors.get(id)
    if (!a) continue
    const world = m.localToWorld(p.copy(a)).clone()
    const dist = world.distanceTo(camera.position)
    const rpx = ((registry.radius.get(id) ?? 0) / (dist * tanHalf)) * (H / 2)
    if (rpx < MIN_RADIUS_PX && !selected) continue
    const ndc = world.clone().project(camera)
    if (ndc.z > 1 || ndc.z < -1) continue
    const sx = (ndc.x * 0.5 + 0.5) * W
    const sy = (-ndc.y * 0.5 + 0.5) * H
    if (sx < EDGE || sx > W - EDGE || sy < top || sy > bottom) continue
    cands.push({ id, sx, sy, rpx, selected, world })
  }
  // Biggest on screen first; the selected bone always wins a slot.
  cands.sort((a, b) => Number(b.selected) - Number(a.selected) || b.rpx - a.rpx)

  const chosen: Cand[] = []
  const names = new Set<string>()
  const perSide = { left: 0, right: 0 }
  for (const c of cands) {
    if (chosen.length >= capacity * 2) break
    const bone = BONE_BY_ID.get(c.id)!
    if (!c.selected && names.has(bone.name)) continue // one "Femur", not two
    const side = c.sx < W / 2 ? 'left' : 'right'
    if (perSide[side] >= capacity) continue
    // Hidden behind another bone? Then skip (unless selected).
    if (!c.selected) {
      const dir = c.world.clone().sub(camera.position)
      const len = dir.length()
      ray.set(camera.position, dir.normalize())
      ray.far = len + 0.001
      const hit = ray.intersectObjects(visible, false)[0]
      if (hit && hit.object.name !== c.id && hit.distance < len - 0.002) continue
    }
    names.add(bone.name)
    perSide[side]++
    chosen.push(c)
  }

  const items: LabelItem[] = chosen.map((c) => {
    const bone = BONE_BY_ID.get(c.id)!
    const side = c.sx < W / 2 ? 'left' : 'right'
    return { id: c.id, text: bone.name, ax: c.sx, ay: c.sy, x: side === 'left' ? EDGE : W - EDGE, y: c.sy, side, width: textWidth(bone.name), selected: c.selected }
  })
  // Spread each column: keep order by anchor height, push down to clear overlaps, then pull back up from the bottom.
  for (const side of ['left', 'right'] as const) {
    const col = items.filter((i) => i.side === side).sort((a, b) => a.ay - b.ay)
    for (let i = 0; i < col.length; i++) col[i].y = Math.max(col[i].ay, i ? col[i - 1].y + ROW : top + ROW / 2)
    for (let i = col.length - 1; i >= 0; i--) col[i].y = Math.min(col[i].y, i < col.length - 1 ? col[i + 1].y - ROW : bottom - ROW / 2)
  }
  return items
}

export function LabelLayout() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as THREE.EventDispatcher<{ change: object }> | null
  const size = useThree((s) => s.size)
  const on = useViewer((s) => s.labels)
  const loaded = useViewer((s) => s.loaded)
  const selectedId = useViewer((s) => s.selectedId)
  const hidden = useViewer((s) => s.hidden)
  const isolated = useViewer((s) => s.isolated)
  const ghost = useViewer((s) => s.ghost)
  const explodeOpen = useViewer((s) => s.explodeOpen)
  const bonesVersion = useHud((s) => s.bonesVersion)

  useEffect(() => {
    if (!on || !loaded || !controls) {
      useHud.setState({ labels: [] })
      return
    }
    let timer = 0
    // Wait a frame so visibility changes from the same update have been applied.
    const recompute = () => {
      timer = window.setTimeout(() => useHud.setState({ labels: layout(camera, size.width, size.height), moving: false }), 30)
    }
    const onChange = () => {
      if (!useHud.getState().moving) useHud.setState({ moving: true })
      window.clearTimeout(timer)
      timer = window.setTimeout(recompute, 160)
    }
    controls.addEventListener('change', onChange)
    recompute()
    return () => {
      controls.removeEventListener('change', onChange)
      window.clearTimeout(timer)
    }
  }, [on, loaded, controls, camera, size, selectedId, hidden, isolated, ghost, explodeOpen, bonesVersion])

  return null
}
