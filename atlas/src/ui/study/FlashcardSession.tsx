import { useEffect, useMemo, useState } from 'react'
import { useViewer, usePrefs } from '../../state/store'
import { useProgress, today } from '../../state/progress'
import { GRADES, intervals, queue, review, deckFor, type DeckCard } from '../../learn/deck'
import type { Bone } from '../../data/types'
import { correctTone, wrongTone } from '../../learn/sound'
import { withSide } from '../../learn/pool'
import { Rating, type Grade } from 'ts-fsrs'
import { SessionTop } from './SessionTop'
import { useStudyInsets } from './useStudyInsets'

interface Queued {
  card: DeckCard
  side: Bone
}
const withRandomSide = (card: DeckCard): Queued => ({ card, side: card.bones[Math.floor(Math.random() * card.bones.length)] })

/** FSRS flashcards: "see" cards (name the lit bone) and "find" cards (tap the named bone). */
export function FlashcardSession({ onClose, onShow }: { onClose: () => void; onShow: (id: string) => void }) {
  const settings = usePrefs((s) => s.study)
  const loaded = useViewer((s) => s.loaded)
  // Each card with the side it is shown on (paired bones: left or right at random).
  const [q, setQ] = useState<Queued[]>(() => {
    const p = useProgress.getState()
    const newDone = p.newToday.date === today() ? p.newToday.count : 0
    return queue(settings.area, p.cards, Math.max(0, settings.newPerDay - newDone)).map(withRandomSide)
  })
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [found, setFound] = useState<boolean | null>(null)
  const [stats, setStats] = useState({ reviewed: 0, again: 0 })
  const card = q[idx]?.card as DeckCard | undefined
  const side = q[idx]?.side

  useStudyInsets(card?.dir === 'find' && !revealed ? 120 : 140, revealed ? 190 : 110)

  useEffect(() => {
    if (!card || !side || !loaded) return
    const v = useViewer.getState()
    if (card.dir === 'see') {
      v.setHighlight({ target: [side.id] })
      v.setOnTap(() => {})
    } else {
      v.frameRegion(side.id)
      v.setOnTap((id) => {
        if (!id) return
        const ok = card.bones.some((b) => b.id === id)
        v.setHighlight({ target: card.bones.map((b) => b.id), wrong: ok ? [] : [id] }, false)
        setFound(ok)
        setRevealed(true)
        if (ok) correctTone()
        else wrongTone()
      })
    }
  }, [card, side, loaded])

  const stored = card ? useProgress.getState().cards[card.id] : undefined
  const ivals = useMemo(() => (card ? intervals(stored) : {}), [card, stored])

  const rate = (grade: Grade) => {
    if (!card || !side) return
    const p = useProgress.getState()
    p.saveCard(card.id, review(p.cards[card.id], grade), !p.cards[card.id])
    p.record(side.id, grade !== Rating.Again)
    setStats((s) => ({ reviewed: s.reviewed + 1, again: s.again + (grade === Rating.Again ? 1 : 0) }))
    // Again: see it once more before the session ends.
    if (grade === Rating.Again) setQ((list) => [...list, withRandomSide(card)])
    setRevealed(false)
    setFound(null)
    setIdx((k) => k + 1)
  }

  if (!card) {
    const all = deckFor(settings.area)
    const stored = useProgress.getState().cards
    const nextDue = all.map((c) => stored[c.id]?.due).filter(Boolean).sort()[0]
    return (
      <>
        <SessionTop title="Flashcards" index={q.length} total={q.length} onClose={onClose} />
        <div className="summary" role="dialog" aria-label="Flashcards done">
          <p className="eyebrow">Flashcards</p>
          <h2>{stats.reviewed ? `${stats.reviewed} reviewed` : 'All caught up'}</h2>
          <p className="muted">
            {stats.again ? `${stats.again} marked Again. ` : ''}
            {nextDue
              ? `Next card due ${new Date(nextDue).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.`
              : 'No cards scheduled yet.'}
          </p>
          <div className="modal-actions">
            <button className="btn primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </>
    )
  }

  const b = side as Bone
  return (
    <>
      <SessionTop title={`Flashcards · ${card.dir === 'see' ? 'Name it' : 'Find it'}`} index={idx} total={q.length} onClose={onClose}>
        <div className="study-prompt">
          {card.dir === 'see' && !revealed && <p className="ask">Name the lit bone, then show the answer.</p>}
          {card.dir === 'find' && !revealed && (
            <p className="ask">
              Find the <strong>{b.name}</strong> {card.bones.length > 1 ? <span className="muted">(either side)</span> : null}
            </p>
          )}
          {revealed && (
            <div className="card-back">
              <p className="ask">
                <strong>{withSide(b)}</strong> <span className="latin">{b.latin}</span>
              </p>
              <p className={`feedback ${found === null ? '' : found ? 'correct' : 'wrong'}`}>
                {found === true && 'Found it.'}
                {found === false && 'Not that one — it’s lit now.'}
                <button className="link-btn" onClick={() => onShow(b.id)}>
                  Open in 3D
                </button>
              </p>
            </div>
          )}
        </div>
      </SessionTop>
      <div className="study-bottom">
        {!revealed ? (
          card.dir === 'see' ? (
            <button className="btn primary wide" onClick={() => setRevealed(true)}>
              Show answer
            </button>
          ) : (
            <button
              className="btn ghost wide"
              onClick={() => {
                useViewer.getState().setHighlight({ target: card.bones.map((x) => x.id) }, false)
                setFound(false)
                setRevealed(true)
              }}
            >
              I don’t know — show me
            </button>
          )
        ) : (
          <div className="grades" role="group" aria-label="How well did you know it?">
            {GRADES.map(({ grade, label }) => (
              <button key={grade} className={`grade g${grade} ${found === false && grade === Rating.Again ? 'suggest' : ''}`} onClick={() => rate(grade)}>
                <span>{label}</span>
                <span className="ival">{ivals[grade]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
