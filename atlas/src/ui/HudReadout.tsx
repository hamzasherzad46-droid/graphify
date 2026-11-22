import { useViewer } from '../state/store'
import { useHud } from '../state/hud'
import { BONE_BY_ID } from '../data/bones'

/** Orientation readout and visibility status, top-left under the header. */
export function HudReadout() {
  const { orientation, azimuth, elevation } = useHud()
  const hidden = useViewer((s) => s.hidden)
  const isolated = useViewer((s) => s.isolated)
  const showAll = useViewer((s) => s.showAll)
  const pad = (n: number) => String(Math.abs(n)).padStart(3, '0')
  return (
    <div className="hud-readout">
      <div className="readout">
        <span className="readout-view">{orientation}</span>
        <span className="readout-num">
          AZ {pad(azimuth)}° · EL {elevation < 0 ? '−' : '+'}
          {pad(elevation).slice(1)}°
        </span>
      </div>
      {(isolated || hidden.length > 0) && (
        <button className="chip status" onClick={showAll}>
          {isolated ? `Isolated: ${BONE_BY_ID.get(isolated[0])?.name ?? ''}` : `${hidden.length} hidden`}
          <span className="chip-action">Show all</span>
        </button>
      )}
    </div>
  )
}
