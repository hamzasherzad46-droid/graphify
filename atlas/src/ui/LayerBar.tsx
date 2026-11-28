import { LAYERS, usePrefs, useViewer, type LayerLevel } from '../state/store'
import { CloseIcon } from './Icons'

/** Short names under the slider's stops (the full name is read out and shown above). */
const SHORT = ['Bones', 'Organs', 'Deep', 'Superficial', 'Skin']

/**
 * The layer control: a slider from the skeleton alone, through the organs and the deep and superficial muscles, to
 * the skin; ghost mode (the outermost layer on show becomes see-through) and modesty. Male model only for now.
 */
export function LayerBar() {
  const open = useViewer((s) => s.layersOpen)
  const layer = useViewer((s) => s.layer)
  const ghost = useViewer((s) => s.ghost)
  const loading = useViewer((s) => s.layerLoading)
  const sex = useViewer((s) => s.sex)
  const modesty = usePrefs((s) => s.modesty)
  const v = useViewer.getState
  if (!open) return null
  const female = sex === 'female'
  const pct = (layer / (LAYERS.length - 1)) * 100
  return (
    <section className="explode-bar layer-bar" aria-label="Layers">
      {female ? (
        <div className="explode-row">
          <p className="layer-note">Female muscles coming soon. The female model shows the skeleton.</p>
          <Close />
        </div>
      ) : (
        <>
          <label className="explode-slider layer-slider">
            <span className="sr-only">Layers</span>
            <input
              type="range"
              min={0}
              max={LAYERS.length - 1}
              step={1}
              value={layer}
              aria-valuetext={LAYERS[layer]}
              onChange={(e) => v().setLayer(Number(e.target.value) as LayerLevel)}
              style={{ '--p': `${pct}%` } as React.CSSProperties}
            />
          </label>
          <div className="layer-ticks" aria-hidden>
            {SHORT.map((t, k) => (
              <button key={t} tabIndex={-1} className={k === layer ? (loading ? 'on loading' : 'on') : ''} onClick={() => v().setLayer(k as LayerLevel)}>
                {t}
              </button>
            ))}
          </div>
          <span className="sr-only" role="status">
            {loading ? `Loading ${LAYERS[layer].toLowerCase()}` : ''}
          </span>
          <div className="explode-row">
            <div className="layer-toggles">
              <button className={`chip ${ghost ? 'on' : ''}`} aria-pressed={ghost} onClick={() => v().setGhost(!ghost)}>
                Ghost mode
              </button>
              <button className={`chip ${modesty ? 'on' : ''}`} aria-pressed={modesty} onClick={() => usePrefs.getState().setModesty(!modesty)}>
                Modesty {modesty ? 'on' : 'off'}
              </button>
            </div>
            <Close />
          </div>
        </>
      )}
    </section>
  )
}

function Close() {
  return (
    <button className="icon-btn" aria-label="Close layers" onClick={() => useViewer.getState().setLayersOpen(false)}>
      <CloseIcon />
    </button>
  )
}
