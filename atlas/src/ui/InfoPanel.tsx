import { useRef, useState } from 'react'
import { BONE_BY_ID, SIDE_SHORT } from '../data/bones'
import type { Bone } from '../data/types'
import { usePrefs, useViewer } from '../state/store'
import { ChevronIcon, CloseIcon, FlagIcon, FocusIcon, GhostIcon, HideIcon, IsolateIcon } from './Icons'
import { ReportSheet } from './ReportSheet'

const TYPE_LABEL: Record<Bone['type'], string> = { long: 'Long', short: 'Short', flat: 'Flat', irregular: 'Irregular', sesamoid: 'Sesamoid' }

/** Bottom sheet for the selected bone. Peeks with the essentials; drag or tap the handle to expand. */
export function InfoPanel() {
  const id = useViewer((s) => s.selectedId)
  const expanded = useViewer((s) => s.panelExpanded)
  const ghost = useViewer((s) => s.ghost)
  const v = useViewer.getState
  const override = usePrefs((s) => (id ? s.reviewOverrides[id] : undefined))
  const reviewerMode = usePrefs((s) => s.reviewerMode)
  const setReview = usePrefs((s) => s.setReview)
  const [reporting, setReporting] = useState(false)
  const drag = useRef<{ y: number; t: number } | null>(null)
  const bone = id ? BONE_BY_ID.get(id) : undefined
  // Keep the last bone rendered while the sheet slides away.
  const [lastBone, setLastBone] = useState<Bone | undefined>(undefined)
  if (bone && bone !== lastBone) setLastBone(bone)
  const b = bone ?? lastBone

  const status = override?.status ?? b?.reviewStatus ?? 'draft'
  const reviewer = override?.reviewer || b?.reviewer

  return (
    <>
      <section className={`panel ${bone ? 'open' : ''} ${expanded ? 'expanded' : ''}`} aria-label="Bone information" aria-hidden={!bone} inert={!bone}>
        {b && (
          <>
            <div
              className="panel-grip"
              onPointerDown={(e) => (drag.current = { y: e.clientY, t: performance.now() })}
              onPointerUp={(e) => {
                const d = drag.current
                drag.current = null
                if (!d) return
                const dy = e.clientY - d.y
                if (Math.abs(dy) < 6) v().setPanelExpanded(!expanded)
                else if (dy < -24) v().setPanelExpanded(true)
                else if (dy > 24) {
                  if (expanded) v().setPanelExpanded(false)
                  else v().select(null)
                }
              }}
              role="button"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <span className="grip" />
            </div>
            <header className="panel-head">
              <div className="panel-title">
                <h2>
                  {b.name}
                  {b.side !== 'midline' && <span className="side-tag">{SIDE_SHORT[b.side]}</span>}
                </h2>
                <p className="latin">{b.latin}</p>
              </div>
              <button className="icon-btn" aria-label="Close" onClick={() => v().select(null)}>
                <CloseIcon />
              </button>
            </header>
            <div className="meta">
              <span className="meta-item">
                <span className="k">Region</span>
                {b.region}
              </span>
              {b.side !== 'midline' && (
                <span className="meta-item">
                  <span className="k">Side</span>
                  {b.side === 'left' ? 'Left' : 'Right'}
                </span>
              )}
              <span className="meta-item">
                <span className="k">Type</span>
                {TYPE_LABEL[b.type]}
              </span>
              <span className={`badge ${status}`}>{status === 'reviewed' ? 'Academically reviewed' : 'Draft'}</span>
            </div>
            <div className="actions">
              <button onClick={() => v().focus(b.id)}>
                <FocusIcon /> Focus
              </button>
              <button onClick={() => v().isolate(b.id)}>
                <IsolateIcon /> Isolate
              </button>
              <button onClick={() => v().hide(b.id)}>
                <HideIcon /> Hide
              </button>
              <button className={ghost ? 'on' : ''} aria-pressed={ghost} onClick={() => v().setGhost(!ghost)}>
                <GhostIcon /> Ghost
              </button>
            </div>
            <div className="panel-body">
              {b.subregion && <p className="subregion">{b.subregion}</p>}
              {b.features.length > 0 && (
                <section>
                  <h3>Key features</h3>
                  <ul className="features">
                    {b.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3>Articulations</h3>
                {b.articulations.length ? (
                  <div className="arts">
                    {b.articulations.map((a) => {
                      const o = BONE_BY_ID.get(a)
                      if (!o) return null
                      return (
                        <button key={a} className="chip" onClick={() => v().select(a, { focus: true })}>
                          {o.name}
                          {o.side !== 'midline' && <span className="chip-side">{SIDE_SHORT[o.side]}</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="muted">No articulation with another bone.</p>
                )}
              </section>
              {b.clinical && (
                <section>
                  <h3>Clinical relevance</h3>
                  <p className="clinical">{b.clinical}</p>
                </section>
              )}
              {b.modelNote && <p className="model-note">{b.modelNote}</p>}
              <footer className="panel-foot">
                <button className="report" onClick={() => setReporting(true)}>
                  <FlagIcon /> Report an error
                </button>
                <span className="muted small">
                  {reviewer ? `Reviewed by ${reviewer}` : 'Not yet reviewed'}
                  {b.lastUpdated ? ` · Updated ${override?.date ?? b.lastUpdated}` : ''}
                </span>
                {reviewerMode && (
                  <label className="review-toggle">
                    <input type="checkbox" checked={status === 'reviewed'} onChange={(e) => setReview(b.id, e.target.checked ? 'reviewed' : 'draft')} />
                    Mark as academically reviewed
                  </label>
                )}
              </footer>
            </div>
            <button className="expand-hint" aria-label={expanded ? 'Show less' : 'Show more'} onClick={() => v().setPanelExpanded(!expanded)}>
              <ChevronIcon style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
            </button>
          </>
        )}
      </section>
      {reporting && b && <ReportSheet bone={b} onClose={() => setReporting(false)} />}
    </>
  )
}
