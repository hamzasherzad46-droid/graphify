import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useViewer } from '../state/store'
import { Skeleton } from './Skeleton'
import { CameraRig } from './CameraRig'
import { Picking } from './Picking'
import { LabelLayout } from './LabelLayout'
import { HudFloor } from './HudFloor'
import { ExplodeAnimator } from './ExplodeAnimator'
import { ThumbnailRenderer } from './ThumbnailRenderer'

/**
 * The 3D view (lazy-loaded chunk: three.js and React Three Fiber). Renders only when something changes, and not at
 * all while it is hidden behind another tab (`paused`), so reading, lessons and file processing get the whole device.
 */
export default function Viewer({ theme, paused = false }: { theme: 'dark' | 'light'; paused?: boolean }) {
  const sex = useViewer((s) => s.sex)
  const thumbs = useViewer((s) => s.thumbs)
  return (
    <Canvas
      className="viewer-canvas"
      frameloop={paused ? 'never' : 'demand'}
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
      <Resume paused={paused} />
    </Canvas>
  )
}

/** Draw a frame as soon as the view is shown again (it may have changed while paused). */
function Resume({ paused }: { paused: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!paused) invalidate()
  }, [paused, invalidate])
  return null
}
