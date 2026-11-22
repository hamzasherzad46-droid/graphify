import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { createMaterials } from './materials'
import { registry, anchors } from './registry'
import { MODEL_URL, preloadModel, useModel } from './modelUrls'
import type { Sex } from '../data/types'

void preloadModel(MODEL_URL.male)

/** A point on the bone's surface near its centre: anchors labels and survives occlusion tests. */
function surfaceAnchor(mesh: THREE.Mesh): THREE.Vector3 {
  const pos = mesh.geometry.getAttribute('position')
  const best = new THREE.Vector3()
  const v = new THREE.Vector3()
  let bestD = Infinity
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const d = v.lengthSq() // geometry is centred on the node origin
    if (d < bestD) {
      bestD = d
      best.copy(v)
    }
  }
  return best
}

export function Skeleton({ theme, sex }: { theme: 'dark' | 'light'; sex: Sex }) {
  const { scene } = useModel(MODEL_URL[sex])
  const invalidate = useThree((s) => s.invalidate)
  const mats = useMemo(() => createMaterials(theme), [theme])
  const glow = useMemo(() => ({ shell: new THREE.Mesh(undefined, mats.glow), xray: new THREE.Mesh(undefined, mats.xray) }), [mats])
  const selectedId = useViewer((s) => s.selectedId)
  const hidden = useViewer((s) => s.hidden)
  const isolated = useViewer((s) => s.isolated)
  const ghost = useViewer((s) => s.ghost)

  // Register meshes once per loaded model.
  useLayoutEffect(() => {
    registry.root = scene as unknown as THREE.Group
    registry.bones.clear()
    registry.context = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.matrixAutoUpdate = true
      if (m.userData.kind === 'bone') {
        registry.bones.set(m.name, m)
        registry.rest.set(m.name, m.position.clone())
        m.geometry.computeBoundingSphere()
        registry.radius.set(m.name, m.geometry.boundingSphere!.radius)
        anchors.set(m.name, surfaceAnchor(m))
      } else {
        registry.context.push(m)
        m.raycast = () => {} // context meshes (cartilage, discs, teeth) are never picked
      }
    })
    useViewer.getState().setLoaded(true)
  }, [scene])

  // Appearance: visibility, ghosting and the selection glow.
  useLayoutEffect(() => {
    const ghostAll = ghost && !selectedId
    for (const [id, m] of registry.bones) {
      m.visible = !hidden.includes(id) && (!isolated || isolated.includes(id))
      const isSel = id === selectedId
      m.material = isSel ? mats.selected : ghost ? mats.ghost : mats.bone
      ;(mats.ghost as THREE.MeshMatcapMaterial).opacity = ghostAll ? mats.palette.ghostOpacity * 3 : mats.palette.ghostOpacity
    }
    for (const m of registry.context) {
      m.visible = !isolated
      m.material = ghost ? mats.contextGhost : mats.context
    }
    glow.shell.removeFromParent()
    glow.xray.removeFromParent()
    const sel = selectedId ? registry.bones.get(selectedId) : null
    if (sel && sel.visible) {
      const r = registry.radius.get(selectedId!) ?? 0.05
      // The x-ray silhouette is only useful when other bones can hide this one.
      for (const g of isolated ? [glow.shell] : [glow.shell, glow.xray]) {
        g.geometry = sel.geometry
        g.raycast = () => {}
        sel.add(g)
      }
      mats.glow.uniforms.uPush.value = THREE.MathUtils.clamp(r * 0.02, 0.00004, 0.0025)
      glow.shell.renderOrder = 2
      glow.xray.renderOrder = 3
    }
    invalidate()
  }, [selectedId, hidden, isolated, ghost, mats, glow, invalidate, scene])

  return <primitive object={scene} />
}
