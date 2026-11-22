import { useHud } from '../state/hud'
import { useViewer } from '../state/store'

/** Leader lines and labels laid out by viewer/LabelLayout. Tapping a label selects its bone. */
export function LabelsOverlay() {
  const labels = useHud((s) => s.labels)
  const moving = useHud((s) => s.moving)
  if (!labels.length) return null
  return (
    <div className={`labels ${moving ? 'moving' : ''}`}>
      <svg className="leaders" aria-hidden>
        {labels.map((l) => {
          const lx = l.side === 'left' ? l.x + l.width + 8 : l.x - l.width - 8
          const elbow = l.side === 'left' ? lx + 10 : lx - 10
          return (
            <g key={l.id} className={l.selected ? 'sel' : ''}>
              <polyline points={`${l.ax},${l.ay} ${elbow},${l.y} ${lx},${l.y}`} />
              <circle cx={l.ax} cy={l.ay} r={2} />
            </g>
          )
        })}
      </svg>
      {labels.map((l) => (
        <button
          key={l.id}
          className={`label ${l.side} ${l.selected ? 'sel' : ''}`}
          style={l.side === 'left' ? { left: l.x, top: l.y } : { right: window.innerWidth - l.x, top: l.y }}
          onClick={() => useViewer.getState().select(l.id)}
        >
          {l.text}
        </button>
      ))}
    </div>
  )
}
