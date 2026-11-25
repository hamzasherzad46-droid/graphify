import { useState } from 'react'
import { GROUPS, regionBones, SIDED_REGIONS, type RegionSide } from '../data/bones'
import { useViewer } from '../state/store'
import { haptic } from '../lib/feedback'
import { ChevronIcon, CloseIcon } from './Icons'
import { Portal } from './Portal'

/** What each region view holds, in plain words. */
const ABOUT: Record<string, string> = {
  all: 'Every bone',
  skull: 'Skull, ear ossicles and hyoid',
  spine: 'Vertebrae, sacrum and coccyx',
  thorax: 'The chest: ribs and sternum',
  'upper-limb': 'Shoulder girdle to fingertips',
  hand: 'Wrist and hand',
  pelvis: 'Hip bones, sacrum and coccyx',
  'lower-limb': 'Thigh to toes',
  foot: 'Ankle and foot',
}

const REGION_VIEWS = [{ id: 'all', label: 'Whole skeleton' }, ...GROUPS.map((g) => ({ id: g.id, label: g.label }))]
const regionLabel = (id: string) => REGION_VIEWS.find((r) => r.id === id)?.label ?? 'Whole skeleton'

function countText(id: string): string {
  if (SIDED_REGIONS.has(id)) return `${regionBones(id, 'left').length} each side`
  return `${regionBones(id).length} bones`
}

/** 3D header button: the region on show; opens the region sheet. */
export function RegionButton() {
  const region = useViewer((s) => s.region)
  const side = useViewer((s) => s.regionSide)
  const [open, setOpen] = useState(false)
  const sideText = SIDED_REGIONS.has(region) && side !== 'both' ? `, ${side}` : ''
  return (
    <>
      <button className={`region-btn ${region !== 'all' ? 'on' : ''}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="region-btn-k">View</span>
        <span className="region-btn-v">
          {regionLabel(region)}
          {sideText}
        </span>
        <ChevronIcon className="region-btn-chev" />
      </button>
      {open && <RegionSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/** Left / Both / Right, for the limbs. */
export function SideSwitch({ compact }: { compact?: boolean }) {
  const region = useViewer((s) => s.region)
  const side = useViewer((s) => s.regionSide)
  const sides: [RegionSide, string][] = [
    ['left', 'Left'],
    ['both', 'Both'],
    ['right', 'Right'],
  ]
  return (
    <div className={`seg side-switch ${compact ? 'compact' : ''}`} role="radiogroup" aria-label="Side" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {sides.map(([v, l]) => (
        <button
          key={v}
          role="radio"
          aria-checked={side === v}
          className={side === v ? 'on' : ''}
          onClick={() => {
            haptic('light')
            useViewer.getState().showRegion(region, v)
          }}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function RegionSheet({ onClose }: { onClose: () => void }) {
  const region = useViewer((s) => s.region)
  const side = useViewer((s) => s.regionSide)
  const pick = (id: string) => {
    haptic('light')
    useViewer.getState().showRegion(id, side)
    onClose()
  }
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <aside className="sheet region-sheet" role="dialog" aria-modal aria-label="Choose what to show in 3D" onClick={(e) => e.stopPropagation()}>
          <header className="sheet-head">
            <h2>Show in 3D</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <p className="muted small region-sheet-hint">Choose a part of the skeleton to see it on its own, larger. Everything else is hidden until you choose the whole skeleton again.</p>
          <div className="region-grid">
            {REGION_VIEWS.map((r) => (
              <button key={r.id} className={`region-tile ${region === r.id ? 'on' : ''}`} aria-pressed={region === r.id} onClick={() => pick(r.id)}>
                <span className="region-tile-title">{r.label}</span>
                <span className="region-tile-about">{ABOUT[r.id]}</span>
                <span className="region-tile-count">{countText(r.id)}</span>
              </button>
            ))}
          </div>
          <div className="region-side">
            <span className="pref-name">Upper limb, hand, lower limb and foot</span>
            <span className="pref-hint">Show the body’s left, right or both.</span>
            <SideSwitch />
          </div>
        </aside>
      </div>
    </Portal>
  )
}
