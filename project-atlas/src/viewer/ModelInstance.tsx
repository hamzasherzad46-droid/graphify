import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ModuleAssets } from '../content/useModule'
import { publicUrl } from '../lib/paths'
import { EMBEDDED_MODELS, loadEmbeddedModel } from './embeddedModel'
import { buildPlaceholder } from './placeholder'
import { Highlighter, PALETTES } from './highlight'
import { useResolvedTheme } from './useResolvedTheme'

const DEG = Math.PI / 180
const DRACO_PATH = publicUrl('draco/') // self-hosted so it works offline
// Our models don't use meshopt; skipping its decoder avoids instantiating WebAssembly for nothing.
const MESHOPT = false

interface InstanceProps {
  assets: ModuleAssets
  highlight: string[]
  glow?: boolean
  /** Explore mode: report the tapped mesh name. */
  onPick?: (meshName: string) => void
  onMatched?: (meshes: THREE.Mesh[]) => void
}

/** Renders a module's model (GLB if present, otherwise primitives) with a highlight. */
export function ModelInstance(props: InstanceProps) {
  const { assets } = props
  return assets.hasModel && assets.info.model ? <GlbModel {...props} file={assets.info.model.file} /> : <PlaceholderInstance {...props} />
}

function GlbModel(props: InstanceProps & { file: string }) {
  return EMBEDDED_MODELS ? <EmbeddedGlb {...props} /> : <FetchedGlb {...props} />
}

function FetchedGlb(props: InstanceProps & { file: string }) {
  const gltf = useGLTF(publicUrl(`models/${props.file}`), DRACO_PATH, MESHOPT)
  return <GlbScene {...props} scene={gltf.scene} />
}

function EmbeddedGlb(props: InstanceProps & { file: string }) {
  const gltf = use(loadEmbeddedModel(props.file))
  return <GlbScene {...props} scene={gltf.scene} />
}

function GlbScene(props: InstanceProps & { scene: THREE.Object3D }) {
  // Clone per instance (the ghost carousel shows extra copies); geometry stays shared.
  const { scene } = props
  const root = useMemo(() => scene.clone(true), [scene])
  const t = props.assets.info.model
  return (
    <group
      scale={t?.scale ?? 1}
      position={t?.position ?? [0, 0, 0]}
      rotation={(t?.rotation ?? [0, 0, 0]).map((d) => d * DEG) as [number, number, number]}
    >
      <Highlighted key={root.uuid} root={root} {...props} />
    </group>
  )
}

function PlaceholderInstance(props: InstanceProps) {
  const root = useMemo(() => buildPlaceholder(props.assets.placeholder.parts), [props.assets.placeholder])
  return <Highlighted key={root.uuid} root={root} {...props} />
}

function Highlighted({ root, highlight, glow = true, onPick, onMatched }: InstanceProps & { root: THREE.Object3D }) {
  const theme = useResolvedTheme()
  const invalidate = useThree((s) => s.invalidate)
  const [highlighter] = useState(() => new Highlighter(root, PALETTES[theme], glow))
  const fade = useRef({ t: 1, from: 0 })
  const key = highlight.join('|')

  useEffect(() => () => highlighter.dispose(), [highlighter])

  useEffect(() => {
    highlighter.setPalette(PALETTES[theme])
    invalidate()
  }, [highlighter, theme, invalidate])

  useEffect(() => {
    const matched = highlighter.apply(key ? key.split('|') : [])
    onMatched?.(matched)
    fade.current = { t: 0, from: performance.now() }
    highlighter.setProgress(0)
    invalidate()
    // onMatched is intentionally not a dependency: it only matters when the highlight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighter, key, invalidate])

  useFrame(() => {
    const f = fade.current
    if (f.t >= 1) return
    f.t = Math.min(1, (performance.now() - f.from) / 700)
    highlighter.setProgress(1 - Math.pow(1 - f.t, 3))
    invalidate()
  })

  const handleClick = onPick
    ? (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) return // was a drag, not a tap
        e.stopPropagation()
        onPick(e.object.name)
      }
    : undefined

  return <primitive object={root} onClick={handleClick} />
}
