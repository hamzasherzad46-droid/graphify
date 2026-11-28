import { useState } from 'react'
import { usePrefs, useViewer, type LabelDensity, type ViewName } from '../state/store'
import { useHud } from '../state/hud'
import { ExplodeIcon, GhostIcon, LabelIcon, LayersIcon, ResetIcon } from './Icons'
import { preloadOrgans } from '../viewer/preload'

const VIEWS: [ViewName, string, string][] = [
  ['anterior', 'ANT', 'Anterior view'],
  ['posterior', 'POST', 'Posterior view'],
  ['left', 'L', 'Left lateral view'],
  ['right', 'R', 'Right lateral view'],
  ['superior', 'SUP', 'Superior view'],
  ['inferior', 'INF', 'Inferior view'],
]

export function Dock() {
  const density = usePrefs((s) => s.labelDensity)
  const [labelMenu, setLabelMenu] = useState(false)
  const ghost = useViewer((s) => s.ghost)
  const explodeOpen = useViewer((s) => s.explodeOpen)
  const layersOpen = useViewer((s) => s.layersOpen)
  const layer = useViewer((s) => s.layer)
  const orientation = useHud((s) => s.orientation)
  const s = useViewer.getState
  return (
    <nav className="dock" aria-label="View controls">
      <div className="views" role="group" aria-label="Preset views">
        {VIEWS.map(([v, short, label]) => (
          <button key={v} className={orientationMatches(orientation, v) ? 'on' : ''} aria-label={label} title={label} onClick={() => s().setView(v)}>
            {short}
          </button>
        ))}
      </div>
      <div className="tools">
        <button
          className={`tool ${density !== 'none' ? 'on' : ''}`}
          aria-haspopup="menu"
          aria-expanded={labelMenu}
          aria-label={`Labels: ${DENSITY_LABEL[density]}`}
          title="Labels"
          onClick={() => setLabelMenu(!labelMenu)}
        >
          <LabelIcon />
        </button>
        <button
          className={`tool ${layersOpen || layer > 0 ? 'on' : ''}`}
          aria-pressed={layersOpen}
          aria-label="Layers: muscles and organs"
          title="Layers"
          onPointerEnter={preloadOrgans}
          onClick={() => {
            preloadOrgans()
            s().setLayersOpen(!layersOpen)
          }}
        >
          <LayersIcon />
        </button>
        <button
          className={`tool ${explodeOpen ? 'on' : ''}`}
          aria-pressed={explodeOpen}
          aria-label="Exploded view"
          title="Exploded view"
          onClick={() => s().setExplodeOpen(!explodeOpen)}
        >
          <ExplodeIcon />
        </button>
        <button className={`tool ${ghost ? 'on' : ''}`} aria-pressed={ghost} aria-label="Ghost mode" title="Ghost mode" onClick={() => s().setGhost(!ghost)}>
          <GhostIcon />
        </button>
        <button className="tool" aria-label="Reset view" title="Reset view" onClick={() => s().resetView()}>
          <ResetIcon />
        </button>
      </div>
      {labelMenu && (
        <div className="label-menu" role="menu" aria-label="Labels">
          <span className="k">Labels</span>
          {(['all', 'main', 'none'] as LabelDensity[]).map((d) => (
            <button
              key={d}
              role="menuitemradio"
              aria-checked={density === d}
              className={density === d ? 'on' : ''}
              onClick={() => {
                usePrefs.getState().setLabelDensity(d)
                setLabelMenu(false)
              }}
            >
              {DENSITY_LABEL[d]}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

const DENSITY_LABEL: Record<LabelDensity, string> = { all: 'All', main: 'Main bones', none: 'None' }

function orientationMatches(o: string, v: ViewName) {
  return o.toLowerCase().startsWith(v)
}
