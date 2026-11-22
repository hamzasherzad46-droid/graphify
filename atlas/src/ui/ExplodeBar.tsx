import { GROUPS } from '../data/bones'
import { useViewer } from '../state/store'
import { CloseIcon } from './Icons'

/** Exploded-view controls: which part explodes, how far, and Reassemble. */
export function ExplodeBar() {
  const open = useViewer((s) => s.explodeOpen)
  const group = useViewer((s) => s.explodeGroup)
  const amount = useViewer((s) => s.explodeAmount)
  const draggedCount = useViewer((s) => Object.keys(s.dragged).length)
  const v = useViewer.getState
  if (!open) return null
  const chips = [{ id: 'all', label: 'Whole skeleton' }, ...GROUPS.map((g) => ({ id: g.id, label: g.label }))]
  return (
    <section className="explode-bar" aria-label="Exploded view">
      <div className="explode-groups" role="radiogroup" aria-label="Part to explode">
        {chips.map((c) => (
          <button key={c.id} role="radio" aria-checked={group === c.id} className={`chip ${group === c.id ? 'on' : ''}`} onClick={() => v().setExplodeGroup(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="explode-row">
        <label className="explode-slider">
          <span className="k">Explode</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(amount * 100)}
            aria-valuetext={`${Math.round(amount * 100)} percent`}
            onChange={(e) => v().setExplodeAmount(Number(e.target.value) / 100)}
            style={{ '--p': `${amount * 100}%` } as React.CSSProperties}
          />
          <span className="pct">{Math.round(amount * 100)}%</span>
        </label>
        <button className="reassemble" disabled={amount === 0 && draggedCount === 0} onClick={() => v().reassemble()}>
          Reassemble
        </button>
        <button className="icon-btn" aria-label="Close exploded view" onClick={() => v().setExplodeOpen(false)}>
          <CloseIcon />
        </button>
      </div>
      <p className="explode-hint">Hold a bone, then drag to pull it out.</p>
    </section>
  )
}
