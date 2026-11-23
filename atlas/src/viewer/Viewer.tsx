import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { Skeleton } from './Skeleton'
import { CameraRig } from './CameraRig'
import { Picking } from './Picking'
import { LabelLayout } from './LabelLayout'
import { HudFloor } from './HudFloor'
import { ExplodeAnimator } from './ExplodeAnimator'
import { ThumbnailRenderer } from './ThumbnailRenderer'

/** The 3D view (lazy-loaded chunk: three.js and React Three Fiber). Renders only when something changes. */
export default function Viewer({ theme }: { theme: 'dark' | 'light' }) {
  const sex = useViewer((s) => s.sex)
  const thumbs = useViewer((s) => s.thumbs)
  return (
    <Canvas
      className="viewer-canvas"
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.005, far: 30, position: [0, 0.9, 4] }}
    >
      <Suspense fallback={null}>
        <Skeleton theme={theme} sex={sex} />
      </Suspense>
      <HudFloor theme={theme} />
      <CameraRig />
      <Picking />
      <LabelLayout />
      <ExplodeAnimator />
      {thumbs && <ThumbnailRenderer target={thumbs} theme={theme} />}
    </Canvas>
  )
}
