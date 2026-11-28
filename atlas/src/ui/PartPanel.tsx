import { useEffect, useRef, useState } from 'react'
import { useViewer } from '../state/store'
import { useNav } from '../state/nav'
import { KIND_LABEL, LAYER_LABEL, loadParts, systemOf, topicFor, type Part } from '../data/parts'
import { TOPICS } from '../learn/topics'
import { structuresForPart } from '../learn/structures'
import { ChevronIcon, CloseIcon, FocusIcon, GhostIcon, HideIcon } from './Icons'

/** Bottom sheet for the selected muscle, organ or other soft part of the male model. */
export function PartPanel() {
  const id = useViewer((s) => s.partId)
  const expanded = useViewer((s) => s.panelExpanded)
  const ghost = useViewer((s) => s.ghost)
  const v = useViewer.getState
  const [parts, setParts] = useState<Map<string, Part> | null>(null)
  const drag = useRef<{ y: number } | null>(null)
  useEffect(() => {
    if (id && !parts) void loadParts().then(setParts)
  }, [id, parts])
  const part = id ? parts?.get(id) : undefined
  // Keep the last part rendered while the sheet slides away.
  const [last, setLast] = useState<Part | undefined>(undefined)
  if (part && part !== last) setLast(part)
  const p = part ?? last
  const topic = p ? TOPICS.find((t) => t.id === topicFor(p)) : undefined
  const lessons = p ? structuresForPart(p.id) : []

  return (
    <section className={`panel ${part ? 'open' : ''} ${expanded ? 'expanded' : ''}`} aria-label="Muscle or organ information" aria-hidden={!part} inert={!part}>
      {p && (
        <>
          <div
            className="panel-grip"
            onPointerDown={(e) => (drag.current = { y: e.clientY })}
            onPointerUp={(e) => {
              const d = drag.current
              drag.current = null
              if (!d) return
              const dy = e.clientY - d.y
              if (Math.abs(dy) < 6) v().setPanelExpanded(!expanded)
              else if (dy < -24) v().setPanelExpanded(true)
              else if (dy > 24) {
                if (expanded) v().setPanelExpanded(false)
                else v().selectPart(null)
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
                {p.name}
                {p.side !== 'midline' && <span className="side-tag">{p.side === 'left' ? 'L' : 'R'}</span>}
              </h2>
              <p className="latin">{KIND_LABEL[p.kind]}</p>
            </div>
            <button className="icon-btn" aria-label="Close" onClick={() => v().selectPart(null)}>
              <CloseIcon />
            </button>
          </header>
          <div className="meta">
            <span className="meta-item">
              <span className="k">System</span>
              {systemOf(p)}
            </span>
            {p.side !== 'midline' && (
              <span className="meta-item">
                <span className="k">Side</span>
                {p.side === 'left' ? 'Left' : 'Right'}
              </span>
            )}
            <span className="meta-item">
              <span className="k">Layer</span>
              {LAYER_LABEL[p.layer]}
            </span>
          </div>
          <div className="actions">
            <button onClick={() => v().selectPart(p.id, { focus: true })}>
              <FocusIcon /> Focus
            </button>
            <button onClick={() => v().hidePart(p.id)}>
              <HideIcon /> Hide
            </button>
            <button className={ghost ? 'on' : ''} aria-pressed={ghost} onClick={() => v().setGhost(!ghost)}>
              <GhostIcon /> Ghost
            </button>
          </div>
          <div className="panel-body">
            {(lessons.length > 0 || topic) && (
              <section>
                <h3>Learn about it</h3>
                <div className="arts">
                  {lessons.map((s) => (
                    <button key={s.id} className="chip" onClick={() => useNav.getState().push({ kind: 'structure', id: s.id })}>
                      Lesson: {s.title}
                    </button>
                  ))}
                  {topic && (
                    <button className="chip" onClick={() => useNav.getState().push({ kind: 'topic', area: 'textbook', topic: topic.id })}>
                      Textbook: {topic.title}
                    </button>
                  )}
                </div>
              </section>
            )}
            <section>
              <h3>3D model (male)</h3>
              <p className="muted small">Z-Anatomy adult male (based on BodyParts3D), lightly smoothed and simplified. The name is the one the model gives.</p>
            </section>
          </div>
          <button className="expand-hint" aria-label={expanded ? 'Show less' : 'Show more'} onClick={() => v().setPanelExpanded(!expanded)}>
            <ChevronIcon style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
          </button>
        </>
      )}
    </section>
  )
}
