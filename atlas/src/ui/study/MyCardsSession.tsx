import { useMemo, useState } from 'react'
import { Rating, type Grade } from 'ts-fsrs'
import { GRADES, intervals, review } from '../../learn/deck'
import { cardKey, liveCards, useMyCards, type MyCard } from '../../learn/mycards'
import { useProgress } from '../../state/progress'
import { haptic } from '../../lib/feedback'
import { SessionTop } from './SessionTop'

/** Due first (earliest first), then cards never studied (oldest first). Own cards have no daily limit. */
function queueOf(): MyCard[] {
  const stored = useProgress.getState().cards
  const now = new Date().toISOString()
  const cards = liveCards(useMyCards.getState().cards)
  const due = cards.filter((c) => stored[cardKey(c)] && stored[cardKey(c)].due <= now).sort((a, b) => stored[cardKey(a)].due.localeCompare(stored[cardKey(b)].due))
  const fresh = cards.filter((c) => !stored[cardKey(c)]).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return [...due, ...fresh]
}

/** My cards: flashcards made from highlights and notes, text on both sides, scheduled with FSRS. */
export function MyCardsSession({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState<MyCard[]>(queueOf)
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState({ reviewed: 0, again: 0 })
  const card = q[idx]
  const stored = card ? useProgress.getState().cards[cardKey(card)] : undefined
  const ivals = useMemo(() => (card ? intervals(stored) : {}), [card, stored])

  const rate = (grade: Grade) => {
    if (!card) return
    haptic(grade === Rating.Again ? 'medium' : 'light')
    const p = useProgress.getState()
    p.saveCard(cardKey(card), review(p.cards[cardKey(card)], grade), false)
    setDone((d) => ({ reviewed: d.reviewed + 1, again: d.again + (grade === Rating.Again ? 1 : 0) }))
    if (grade === Rating.Again) setQ((list) => [...list, card]) // once more before the end
    setShown(false)
    setIdx((k) => k + 1)
  }

  if (!card) {
    const all = liveCards(useMyCards.getState().cards)
    const stored = useProgress.getState().cards
    const next = all.map((c) => stored[cardKey(c)]?.due).filter(Boolean).sort()[0]
    return (
      <div className="mycards-session">
        <SessionTop title="My cards" index={q.length} total={q.length} onClose={onClose} />
        <div className="mycards-done">
          <p className="eyebrow">My cards</p>
          <h2>{done.reviewed ? `${done.reviewed} reviewed` : 'All caught up'}</h2>
          <p className="muted">
            {done.again ? `${done.again} marked Again. ` : ''}
            {next ? `Next card due ${new Date(next).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : ''}
          </p>
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mycards-session">
      <SessionTop title="My cards" index={idx} total={q.length} onClose={onClose} />
      <div className="mycard">
        <p className="mycard-from">{card.from.docLabel}</p>
        <p className="mycard-front">{card.front}</p>
        {shown && (
          <div className="mycard-back">
            <span className="k">Answer</span>
            <p>{card.back}</p>
          </div>
        )}
      </div>
      <div className="study-bottom">
        {!shown ? (
          <button className="btn primary wide" onClick={() => setShown(true)}>
            Show answer
          </button>
        ) : (
          <div className="grades" role="group" aria-label="How well did you know it?">
            {GRADES.map(({ grade, label }) => (
              <button key={grade} className={`grade g${grade}`} onClick={() => rate(grade)}>
                <span>{label}</span>
                <span className="ival">{ivals[grade]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
