import { useViewer } from '../state/store'
import { useHud } from '../state/hud'
import { BONE_BY_ID } from '../data/bones'

/** Orientation readout and visibility status, top-left under the header. */
export function HudReadout() {
  const { orientation, azimuth, elevation } = useHud()
  const hidden = useViewer((s) => s.hidden)
  const isolated = useViewer((s) => s.isolated)
  const showAll = useViewer((s) => s.showAll)
  const explodeOpen = useViewer((s) => s.explodeOpen)
  const moved = useViewer((s) => Object.keys(s.dragged).length + (s.explodeAmount > 0 ? 1 : 0))
  const reassemble = useViewer((s) => s.reassemble)
  const pad = (n: number) => String(Math.abs(n)).padStart(3, '0')
  return (
    <div className={`hud-readout ${explodeOpen ? 'below-explode' : ''}`}>
      <div className="readout">
        <span className="readout-view">{orientation}</span>
        <span className="readout-num">
          AZ {pad(azimuth)}° · EL {elevation < 0 ? '−' : '+'}
          {pad(elevation).slice(1)}°
        </span>
      </div>
      {!explodeOpen && moved > 0 && (
        <button className="chip status" onClick={reassemble}>
          Bones moved<span className="chip-action">Reassemble</span>
        </button>
      )}
      {(isolated || hidden.length > 0) && (
        <button className="chip status" onClick={showAll}>
          {isolated ? `Isolated: ${BONE_BY_ID.get(isolated[0])?.name ?? ''}` : `${hidden.length} hidden`}
          <span className="chip-action">Show all</span>
        </button>
      )}
    </div>
  )
}
