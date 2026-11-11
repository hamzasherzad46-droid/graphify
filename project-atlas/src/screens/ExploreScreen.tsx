import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { CameraView, Structure } from '../content/types'
import { useModule } from '../content/useModule'
import { meshKeys, meshMatchesAny } from '../lib/meshMatch'
import { defaultModuleId } from '../state/actions'
import { useSettings } from '../state/settings'
import type { CameraApi } from '../viewer/CameraRig'

const AnatomyViewer = lazy(() => import('../viewer/AnatomyViewer'))

const OVERVIEW: CameraView = { position: [0.7, 1.05, 2.55], target: [0, 0.88, 0] }

/** Free explore: drag, pinch, tap a structure to see what it is. */
export function ExploreScreen() {
  const { assets } = useModule(defaultModuleId)
  const track = useSettings((s) => s.track)
  const [selected, setSelected] = useState<Structure | null>(null)
  const [view, setView] = useState<CameraView>(OVERVIEW)
  const [copied, setCopied] = useState(false)
  const camera = useRef<CameraApi>(null)

  const highlight = useMemo(() => (selected ? meshKeys(selected.meshName) : []), [selected])

  const onPick = (meshName: string) => {
    const s = assets?.content.structures.find((x) => meshMatchesAny(meshName, meshKeys(x.meshName)))
    setSelected(s ?? null)
  }

  // Dev helper for authoring content: copy the current camera as JSON.
  const copyCamera = async () => {
    const v = camera.current?.getView()
    if (!v) return
    await navigator.clipboard?.writeText(JSON.stringify({ camera: v }))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <main className="explore">
      <header className="explore-head">
        <h1 className="screen-title">3D Learning</h1>
        <p className="muted small">Drag to rotate · pinch to zoom · double-tap to reset · tap a bone</p>
      </header>
      <div className="explore-viewer">
        {assets && (
          <Suspense fallback={null}>
            <AnatomyViewer assets={assets} highlight={highlight} view={view} onPick={onPick} cameraApi={camera} />
          </Suspense>
        )}
        {import.meta.env.DEV && (
          <button className="dev-copy" onClick={() => void copyCamera()}>
            {copied ? 'Copied' : 'Copy camera'}
          </button>
        )}
      </div>
      <section className={`explore-card${selected ? ' open' : ''}`} aria-live="polite">
        {selected ? (
          <>
            <div className="row">
              <h2 className="serif explore-name">{selected.name}</h2>
              <button className="explore-close muted" onClick={() => setSelected(null)} aria-label="Clear selection">
                ✕
              </button>
            </div>
            {track === 'medicine' && selected.latinName.toLowerCase() !== selected.name.toLowerCase() && (
              <p className="serif explore-latin">{selected.latinName}</p>
            )}
            <p className="muted small">{selected.definition}</p>
            <p className="small explore-note">{track === 'nursing' ? selected.nursingNote : selected.medicineNote}</p>
            <div className="explore-actions">
              <button className="btn btn-ghost" onClick={() => setView({ ...selected.camera })}>
                Focus
              </button>
              <button className="btn btn-ghost" onClick={() => setView({ ...OVERVIEW })}>
                Whole body
              </button>
            </div>
          </>
        ) : (
          <p className="muted small">Tap any structure to see its name and definition.</p>
        )}
      </section>
    </main>
  )
}
