import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { usePrefs, useViewer, type LayerLevel } from '../state/store'
import { loadParts, partShown, type Part } from '../data/parts'
import { anatomyLights, organMaterial, skinMaterial, tissueMaterial, type OrganKind, type TissueKind } from './anatomyMaterials'
import { preloadModel, useModel } from './modelUrls'
import { registry } from './registry'
import { buildBvhs } from './bvh'
import { DETAILED, TISSUE_URL } from './preload'

/**
 * The male model's soft tissue: organs, deep and superficial muscles with their tendons and retinacula, and the skin,
 * shown layer by layer (LAYERS in the store). Each model loads the first time its layer is shown. Phones get the
 * lighter version of each model and plainer materials.
 */
const URL = TISSUE_URL

/**
 * The outermost layer on show, which ghost mode makes see-through: with the organs, the bones around them (the
 * skeleton's own ghost mode); with muscles, the outer muscles; with the skin, the skin.
 */
const outermost = (p: Part, level: LayerLevel) => (level === 2 && p.layer === 'deep') || (level === 3 && p.layer !== 'organs' && p.layer !== 'deep')

export function SoftTissue({ theme }: { theme: 'dark' | 'light' }) {
  const layer = useViewer((s) => s.layer)
  const sex = useViewer((s) => s.sex)
  const open = useViewer((s) => s.layersOpen && s.sex === 'male')
  const [need, setNeed] = useState({ organs: false, muscles: false })
  const level = sex === 'male' ? layer : 0
  if ((level >= 1 && !need.organs) || (level >= 2 && !need.muscles)) setNeed({ organs: need.organs || level >= 1, muscles: need.muscles || level >= 2 })
  // With the layer control open, both models are downloaded and decoded in the background (organs first), so moving
  // the slider never waits for them.
  useEffect(() => {
    if (!open) return
    let stop = false
    const idle = (f: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 300))
    idle(() => !stop && void preloadModel(URL.organs).then(() => idle(() => !stop && void preloadModel(URL.muscles).catch(() => {}))).catch(() => {}))
    return () => void (stop = true)
  }, [open])
  if (sex !== 'male') return null
  return (
    <>
      {level > 0 && <StudioLights />}
      {need.organs && (
        <Suspense fallback={<Loading />}>
          <PartsModel url={URL.organs} level={level} theme={theme} />
        </Suspense>
      )}
      {need.muscles && (
        <Suspense fallback={<Loading />}>
          <PartsModel url={URL.muscles} level={level} theme={theme} />
        </Suspense>
      )}
    </>
  )
}

/** While a model loads, the layer control says so. */
function Loading() {
  useEffect(() => {
    useViewer.setState({ layerLoading: true })
    return () => useViewer.setState({ layerLoading: false })
  }, [])
  return null
}

/** How long a layer takes to fade in or out (none when the system asks for reduced motion). */
const FADE_MS = 280
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Soft studio lights, fixed to the camera so the model is always lit from the front. */
function StudioLights() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const lights = anatomyLights()
    const added: THREE.Object3D[] = []
    if (!camera.parent) {
      scene.add(camera)
      added.push(camera)
    }
    for (const l of lights) {
      if (l instanceof THREE.DirectionalLight) {
        camera.add(l)
        l.target.position.set(0, 0, -1)
        camera.add(l.target)
      } else scene.add(l)
    }
    invalidate()
    return () => {
      for (const l of lights) {
        l.removeFromParent()
        if (l instanceof THREE.DirectionalLight) l.target.removeFromParent()
      }
      for (const o of added) o.removeFromParent()
      invalidate()
    }
  }, [camera, scene, invalidate])
  return null
}

const PARTS = loadParts()

/** The bones of the cranial vault and base: while all are on show and opaque, the brain cannot be seen. */
const CRANIAL = new Set(['frontal_bone', 'parietal_bone_left', 'parietal_bone_right', 'occipital_bone', 'temporal_bone_left', 'temporal_bone_right', 'sphenoid_bone', 'ethmoid_bone'])

function PartsModel({ url, level, theme }: { url: string; level: LayerLevel; theme: 'dark' | 'light' }) {
  const { scene } = useModel(url)
  const [parts, setParts] = useState<Map<string, Part> | null>(null)
  const invalidate = useThree((s) => s.invalidate)
  const ghost = useViewer((s) => s.ghost)
  const partId = useViewer((s) => s.partId)
  const hiddenParts = useViewer((s) => s.hiddenParts)
  const modesty = usePrefs((s) => s.modesty)
  const studying = useViewer((s) => s.studying)
  // Parts that cannot be seen are not drawn (a large saving on phones): the brain inside the skull and the spinal cord
  // inside the vertebral canal, unless the bones are see-through or not on show; everything under the skin.
  const skullOpen = useViewer((s) => (s.ghost && s.layer <= 1) || !!s.isolated || s.hidden.some((h) => CRANIAL.has(h)) || (!!s.regionIds && !s.regionIds.includes('parietal_bone_left')))
  const spineOpen = useViewer((s) => (s.ghost && s.layer <= 1) || !!s.isolated || s.hidden.some((h) => h.startsWith('vertebra_')) || (!!s.regionIds && !s.regionIds.includes('vertebra_t6')))
  useEffect(() => void PARTS.then(setParts), [])

  // Shared materials for selection and ghost mode.
  const shared = useMemo(
    () => ({
      selected: new THREE.MeshStandardMaterial({ color: theme === 'dark' ? '#8ff0e4' : '#2bb5a6', roughness: 0.5, emissive: theme === 'dark' ? '#164d48' : '#0b3b36' }),
      ghostMuscle: new THREE.MeshStandardMaterial({ color: '#c0574b', roughness: 0.6, transparent: true, opacity: 0.12, depthWrite: false }),
      ghostOrgan: new THREE.MeshStandardMaterial({ color: '#d9a08f', roughness: 0.6, transparent: true, opacity: 0.16, depthWrite: false }),
      ghostSkin: new THREE.MeshStandardMaterial({ color: '#d9a88c', roughness: 0.6, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    }),
    [theme],
  )

  // Own materials, and the parts registered for picking and camera flights, once per loaded model.
  const own = useMemo(() => new Map<THREE.Mesh, THREE.Material>(), [])
  useLayoutEffect(() => {
    if (!parts) return
    const meshes: THREE.Mesh[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const x = m.userData as { layer?: string; kind?: string }
      if (x.layer === 'skin') {
        own.set(m, skinMaterial())
        m.raycast = () => {} // the skin is never picked: taps go through to what lies beneath
        m.renderOrder = 2
        return
      }
      const p = parts.get(m.name)
      if (!p) return
      own.set(m, p.layer === 'organs' ? organMaterial(p.kind as OrganKind, m.name, !DETAILED) : tissueMaterial(p.kind as TissueKind, m.name, !DETAILED))
      registry.parts.set(m.name, m)
      meshes.push(m)
    })
    buildBvhs(meshes)
    // A part chosen before its model had loaded (from a lesson): fly to it now.
    const s = useViewer.getState()
    if (s.partId && registry.parts.has(s.partId)) s.selectPart(s.partId, { focus: true })
    return () => {
      for (const m of meshes) registry.parts.delete(m.name)
    }
  }, [scene, parts, own])

  // What is shown, and how: layer, modesty, hidden parts, ghost mode and the selection. A change of layer fades: what
  // comes into view fades in while what leaves fades out.
  const fade = useRef<{ raf: number; finish: () => void } | null>(null)
  const lastLevel = useRef<LayerLevel | null>(null)
  useLayoutEffect(() => {
    if (!parts) return
    fade.current?.finish()
    const lv: LayerLevel = studying ? 0 : level
    const layerChange = lastLevel.current !== null && lastLevel.current !== lv
    lastLevel.current = lv
    const incoming: THREE.Mesh[] = []
    const outgoing: THREE.Mesh[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      let show: boolean
      if ((m.userData as { layer?: string }).layer === 'skin') {
        show = lv >= 4
        m.material = ghost ? shared.ghostSkin : own.get(m)!
      } else {
        const p = parts.get(m.name)
        if (!p) {
          m.visible = false
          return
        }
        const enclosed = (p.kind === 'brain' && !skullOpen) || (p.kind === 'cord' && !spineOpen) || (lv >= 4 && !ghost && p.kind !== 'eye')
        show = partShown(p, lv, modesty) && !hiddenParts.includes(p.id) && !enclosed
        const see = ghost && lv < 4 && outermost(p, lv)
        m.material = p.id === partId ? shared.selected : see ? (p.layer === 'organs' ? shared.ghostOrgan : shared.ghostMuscle) : own.get(m)!
        m.renderOrder = see ? 3 : 0
      }
      // Only a mesh's own material fades (the shared selection and ghost materials stay as they are).
      if (layerChange && show !== m.visible && m.material === own.get(m)) (show ? incoming : outgoing).push(m)
      else m.visible = show
    })
    const settle = () => useViewer.getState().layerShown !== lv && useViewer.setState({ layerShown: lv })
    if (!incoming.length && !outgoing.length) {
      settle()
      invalidate()
      return
    }
    const mats = [...incoming, ...outgoing].map((m) => {
      const mat = m.material as THREE.Material
      return { m, mat, opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, inn: incoming.includes(m) }
    })
    for (const x of mats) {
      x.m.visible = true
      x.mat.transparent = true
      x.mat.depthWrite = x.inn ? x.depthWrite : false
    }
    const t0 = performance.now()
    const duration = reducedMotion() ? 0 : FADE_MS
    const finish = () => {
      cancelAnimationFrame(state.raf)
      for (const x of mats) {
        x.mat.opacity = x.opacity
        x.mat.transparent = x.transparent
        x.mat.depthWrite = x.depthWrite
        if (!x.inn) x.m.visible = false
      }
      fade.current = null
      settle()
      invalidate()
    }
    const step = () => {
      const t = duration ? Math.min(1, (performance.now() - t0) / duration) : 1
      const e = t * t * (3 - 2 * t) // smoothstep
      for (const x of mats) x.mat.opacity = x.opacity * (x.inn ? e : 1 - e)
      invalidate()
      if (t < 1) state.raf = requestAnimationFrame(step)
      else finish()
    }
    const state = { raf: 0, finish }
    fade.current = state
    step()
  }, [scene, parts, level, ghost, partId, hiddenParts, modesty, studying, shared, own, invalidate, skullOpen, spineOpen])
  useEffect(() => () => fade.current?.finish(), [])

  return <primitive object={scene} />
}
