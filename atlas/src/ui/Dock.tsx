import { useViewer, type ViewName } from '../state/store'
import { useHud } from '../state/hud'
import { ExplodeIcon, GhostIcon, LabelIcon, ResetIcon } from './Icons'

const VIEWS: [ViewName, string, string][] = [
  ['anterior', 'ANT', 'Anterior view'],
  ['posterior', 'POST', 'Posterior view'],
  ['left', 'L', 'Left lateral view'],
  ['right', 'R', 'Right lateral view'],
  ['superior', 'SUP', 'Superior view'],
  ['inferior', 'INF', 'Inferior view'],
]

export function Dock() {
  const labels = useViewer((s) => s.labels)
  const ghost = useViewer((s) => s.ghost)
  const explodeOpen = useViewer((s) => s.explodeOpen)
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
        <button className={`tool ${labels ? 'on' : ''}`} aria-pressed={labels} aria-label="Labels" title="Labels" onClick={() => s().setLabels(!labels)}>
          <LabelIcon />
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
    </nav>
  )
}

function orientationMatches(o: string, v: ViewName) {
  return o.toLowerCase().startsWith(v)
}
