import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { usePrefs, useViewer } from '../state/store'
import { INSETS, topInset } from '../state/hud'
import { BONES, BONE_BY_ID, REGIONS } from '../data/bones'
import labelsJson from '../../content/labels.json'
import { registry, anchors } from './registry'
import { groupOverflow, placeLabels, type Groupable, type LayoutBox } from './labelLayout'
import { groupMembers, labelDom, labelWidth, maxLabelWidth, shortLabel, useLabelSet } from './labelDom'

const MAIN = new Set(labelsJson.main)
/** A bone's cluster for group labels: same region, subregion and side (e.g. the left hand's phalanges). */
const clusterOf = (b: (typeof BONES)[number]) => `${b.region}|${b.subregion ?? b.region}|${b.side}`
/** Coarser fallback when clusters alone don't fit: the region on that side (e.g. the left hand). */
const regionOf = (b: (typeof BONES)[number]) => `R|${b.region}|${b.side}`
const REGION_LABEL = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]))
/** "Skull, left" / "Spine": region summaries name the side, so the three skull groups are told apart. */
const regionText = (b: (typeof BONES)[number]) => `${REGION_LABEL[b.region] ?? b.region}${b.side === 'midline' ? '' : `, ${b.side}`}`
/** Every possible group label: each cluster and each region, in either column. */
const ALL_GROUP_IDS = [...new Set([...BONES.map(clusterOf), ...BONES.map(regionOf)])].flatMap((c) => [`group:left:${c}`, `group:right:${c}`])
const OCCLUSION_CHECKS_PER_FRAME = 8
const LABEL_H = 16 // px, matches .label height in app.css

/** Writes a DOM value only when it changed (most frames move only a few labels). */
const written = new WeakMap<Element, Record<string, string>>()
function put(el: Element, key: string, value: string, apply: () => void) {
  let rec = written.get(el)
  if (!rec) written.set(el, (rec = {}))
  if (rec[key] === value) return
  rec[key] = value
  apply()
}

/**
 * Bone labels that never disappear: laid out every rendered frame, so they follow their bones while the camera
 * rotates, zooms and pans.
 * - Label boxes glide to their slots; spacing is enforced on the animated positions too, so labels never overlap.
 * - A label that changes column cross-fades into the other column instead of sliding across the screen.
 * - The leader line and its dot stay exactly on the bone. A bone behind other bones keeps its label; its leader is
 *   faded and dashed.
 * - "All": when a column can't fit every label at this zoom, whole clusters (e.g. the left hand's phalanges) share
 *   one group label until you zoom in; tapping it frames that cluster.
 */
export function LabelLayout() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const density = usePrefs((s) => s.labelDensity)
  const loaded = useViewer((s) => s.loaded)
  const selectedId = useViewer((s) => s.selectedId)
  const hidden = useViewer((s) => s.hidden)
  const isolated = useViewer((s) => s.isolated)
  const studying = useViewer((s) => s.studying)
  const sex = useViewer((s) => s.sex)

  const ids = useMemo(() => {
    if (!loaded || studying) return []
    const visible = (id: string) => registry.bones.has(id) && !hidden.includes(id) && (!isolated || isolated.includes(id))
    const set = new Set<string>()
    if (density === 'all') for (const id of registry.bones.keys()) if (visible(id)) set.add(id)
    if (density === 'main') for (const id of MAIN) if (visible(id)) set.add(id)
    if (selectedId && visible(selectedId)) set.add(selectedId)
    return [...set]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, loaded, studying, selectedId, hidden, isolated, sex])

  useEffect(() => {
    useLabelSet.setState({ ids, selected: selectedId, groupIds: density === 'all' && ids.length ? ALL_GROUP_IDS : [] })
    invalidate()
  }, [ids, selectedId, density, invalidate])

  const state = useRef({
    pos: new Map<string, { x: number; y: number }>(),
    side: new Map<string, 'left' | 'right'>(),
    shown: new Set<string>(),
    occluded: new Map<string, boolean>(),
    rr: 0,
  })
  const tmp = useMemo(() => {
    const ray = new THREE.Raycaster()
    ray.firstHitOnly = true
    return { v: new THREE.Vector3(), view: new THREE.Vector3(), dir: new THREE.Vector3(), ray }
  }, [])

  useFrame((_, dt) => {
    const t0 = import.meta.env.DEV ? performance.now() : 0
    try {
      frame(dt)
    } finally {
      if (import.meta.env.DEV) ((window as unknown as { __labelMs: number[] }).__labelMs ??= []).push(performance.now() - t0)
    }
  })

  function frame(dt: number) {
    const st = state.current
    const { ids: current, selected } = useLabelSet.getState()
    if (!current.length) {
      st.shown.clear()
      return
    }
    const W = size.width
    const H = size.height
    const v = useViewer.getState()
    const box: LayoutBox = {
      width: W,
      top: topInset(v.explodeOpen) + 20, // below the orientation readout
      bottom: H - (v.selectedId ? INSETS.panel : INSETS.bottom) - 6,
      row: 22,
      minRow: LABEL_H, // a label box is exactly one minimum row tall, so boxes never overlap
      edge: 10,
      gap: 14,
      hysteresis: 0.12,
    }

    // 1. Anchors on screen: a point on each bone's surface, moved with the bone.
    const anchorPx = new Map<string, { ax: number; ay: number; behind: boolean }>()
    for (const id of current) {
      const m = registry.bones.get(id)
      const a = anchors.get(id)
      if (!m || !a) continue
      const p = m.localToWorld(tmp.v.copy(a))
      const behind = tmp.view.copy(p).applyMatrix4(camera.matrixWorldInverse).z > 0
      p.project(camera)
      let ax = (p.x * 0.5 + 0.5) * W
      let ay = (-p.y * 0.5 + 0.5) * H
      if (behind) {
        // Behind the camera: aim the leader off the screen edge, towards the bone.
        ax = W / 2 - (ax - W / 2) * 50
        ay = H / 2 - (ay - H / 2) * 50
      }
      anchorPx.set(id, { ax, ay, behind })
    }

    // 2. Occlusion, a few labels per frame: is another bone in front of the anchor?
    const occluders = v.ghost ? [] : [...registry.bones.values()].filter((m) => m.visible)
    const list = [...anchorPx.keys()]
    for (let k = 0; k < Math.min(OCCLUSION_CHECKS_PER_FRAME, list.length); k++) {
      const id = list[(st.rr + k) % list.length]
      const p = registry.bones.get(id)!.localToWorld(tmp.v.copy(anchors.get(id)!))
      const dist = p.distanceTo(camera.position)
      tmp.ray.set(camera.position, tmp.dir.copy(p).sub(camera.position).normalize())
      tmp.ray.far = dist
      const hit = occluders.length ? tmp.ray.intersectObjects(occluders, false)[0] : undefined
      st.occluded.set(id, !!hit && hit.object.name !== id && hit.distance < dist - 0.003)
    }
    st.rr = (st.rr + OCCLUSION_CHECKS_PER_FRAME) % Math.max(1, list.length)

    // 3. Group overflowing clusters ("All" at whole-body zoom), then place.
    const offScreen = (a: { ax: number; ay: number; behind: boolean }) => a.behind || a.ax < 0 || a.ax > W || a.ay < 0 || a.ay > H
    const inputs: Groupable[] = list.map((id) => {
      const b = BONE_BY_ID.get(id)!
      const a = anchorPx.get(id)!
      // "All", zoomed in: bones off the screen are summarised by region ("Skull (29)"), not by small clusters.
      const far = density === 'all' && offScreen(a) && id !== selected
      return {
        id,
        ax: a.ax,
        ay: a.ay,
        width: Math.min(labelWidth(shortLabel(id, b.name)), maxLabelWidth(W)),
        prevSide: st.side.get(id),
        cluster: far ? regionOf(b) : clusterOf(b),
        clusterLabel: far ? regionText(b) : (b.subregion ?? b.region),
        region: regionOf(b),
        regionLabel: regionText(b),
        keep: id === selected,
      }
    })
    // Group labels are mounted up front ("All"), so a group can take over at once: no gap, no overflow.
    const { items, groups } = groupOverflow(inputs, box, (gid) => !!labelDom.get(gid)?.box)
    for (const it of items) {
      const g = groups.find((x) => x.id === it.id)
      if (g) {
        it.width = Math.min(labelWidth(g.text), maxLabelWidth(W))
        it.prevSide = st.side.get(g.id) ?? it.prevSide
      }
    }
    groupMembers.clear()
    for (const g of groups) groupMembers.set(g.id, g.members)
    const placed = placeLabels(items, box)

    // 4. Animate. Boxes glide (or cross-fade when they change column); lines and dots follow the bone exactly.
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 16)
    let moving = false
    const groupAnchor = (gid: string) => {
      const g = groups.find((x) => x.id === gid)!
      const ms = g.members.map((m) => anchorPx.get(m)!)
      return { ax: ms.reduce((s, a) => s + a.ax, 0) / ms.length, ay: ms.reduce((s, a) => s + a.ay, 0) / ms.length, behind: false }
    }
    const textOf = (id: string) => (id.startsWith('group:') ? (groups.find((g) => g.id === id)?.text ?? id) : shortLabel(id, BONE_BY_ID.get(id)?.name ?? id))
    const nowShown = new Set<string>()
    for (const side of ['left', 'right'] as const) {
      const col = placed.filter((p) => p.side === side).sort((a, b) => a.y - b.y)
      const row = col.length > 1 ? Math.min(...col.slice(1).map((p, i) => p.y - col[i].y)) : box.row
      // a) Move each label towards its slot (or place it outright: new, or changed column).
      const live: { pl: (typeof col)[number]; els: NonNullable<ReturnType<typeof labelDom.get>>; cur: { x: number; y: number }; width: number }[] = []
      for (const pl of col) {
        const els = labelDom.get(pl.id)
        if (!els?.box || !els.line || !els.dot) {
          moving = true // its nodes mount on the next render; draw it then
          continue
        }
        const width = Math.min(labelWidth(textOf(pl.id)), maxLabelWidth(W))
        const tx = pl.side === 'left' ? pl.x : pl.x - width
        let cur = st.pos.get(pl.id)
        const switched = st.side.get(pl.id) !== undefined && st.side.get(pl.id) !== pl.side
        if (!cur || switched || !st.shown.has(pl.id)) {
          cur = { x: tx, y: pl.y }
          st.pos.set(pl.id, cur)
          els.box.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' })
        } else {
          cur.x += (tx - cur.x) * k
          cur.y += (pl.y - cur.y) * k
          if (Math.abs(tx - cur.x) > 0.3 || Math.abs(pl.y - cur.y) > 0.3) moving = true
        }
        live.push({ pl, els, cur, width })
      }
      // b) Never overlap and never leave the column, even mid-animation: push down from the top, then pull back
      //    up from the bottom limit (the slots themselves always fit, so this only trims the glide).
      const lo = box.top + row / 2
      const hi = box.bottom - row / 2
      for (let i = 0; i < live.length; i++) live[i].cur.y = Math.max(live[i].cur.y, i ? live[i - 1].cur.y + row - 0.01 : lo)
      for (let i = live.length - 1; i >= 0; i--) live[i].cur.y = Math.min(live[i].cur.y, i < live.length - 1 ? live[i + 1].cur.y - row + 0.01 : hi)
      // c) Draw.
      for (const { pl, els, cur, width } of live) {
        st.side.set(pl.id, pl.side)
        nowShown.add(pl.id)
        const a = pl.id.startsWith('group:') ? groupAnchor(pl.id) : anchorPx.get(pl.id)!
        const occ = !pl.id.startsWith('group:') && (a.behind || !!st.occluded.get(pl.id))
        const { box: b, line, dot } = els
        const isSel = pl.id === selected
        const transform = `translate3d(${cur.x.toFixed(1)}px, ${(cur.y - LABEL_H / 2).toFixed(1)}px, 0)`
        if (pl.id.startsWith('group:')) {
          const text = textOf(pl.id)
          put(b, 'txt', text, () => {
            b.textContent = text
            b.setAttribute('aria-label', text)
            b.title = text
          })
        }
        put(b, 'vis', 'visible', () => (b.style.visibility = 'visible'))
        put(b, 'tf', transform, () => (b.style.transform = transform))
        put(b, 'cls', `${occ}${isSel}`, () => {
          b.classList.toggle('occ', occ)
          b.classList.toggle('sel', isSel)
          b.dataset.ready = '1'
        })
        const edgeX = pl.side === 'left' ? cur.x + width + 4 : cur.x - 4
        const elbowX = pl.side === 'left' ? edgeX + 10 : edgeX - 10
        const pts = `${a.ax.toFixed(1)},${a.ay.toFixed(1)} ${elbowX.toFixed(1)},${cur.y.toFixed(1)} ${edgeX.toFixed(1)},${cur.y.toFixed(1)}`
        put(line, 'pts', pts, () => line.setAttribute('points', pts))
        put(line, 'cls', `${occ}${isSel}`, () => {
          line.classList.toggle('occ', occ)
          line.classList.toggle('sel', isSel)
        })
        const cx = a.ax.toFixed(1)
        const cy = a.ay.toFixed(1)
        put(dot, 'c', `${cx},${cy}`, () => {
          dot.setAttribute('cx', cx)
          dot.setAttribute('cy', cy)
        })
        put(dot, 'cls', `${occ}`, () => dot.classList.toggle('occ', occ))
      }
    }
    // Bones covered by a group label (and stale nodes) are not drawn on their own.
    for (const [id, els] of labelDom) {
      if (nowShown.has(id) || !els.box) continue
      const { box: b, line, dot } = els
      put(b, 'vis', 'hidden', () => (b.style.visibility = 'hidden'))
      if (line) put(line, 'pts', '', () => line.setAttribute('points', ''))
      if (dot) put(dot, 'c', 'off', () => dot.setAttribute('cx', '-100'))
    }
    st.shown = nowShown
    for (const id of st.pos.keys()) if (!nowShown.has(id)) st.pos.delete(id)
    if (moving) invalidate()
  }

  return null
}
