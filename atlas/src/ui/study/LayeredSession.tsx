import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { Rating, type Grade } from 'ts-fsrs'
import { GRADES, intervals, review } from '../../learn/deck'
import { LAYERED, LEVEL_NAME, needsReview, TYPE_NAME, layeredKey, type CardLevel, type Fact, type LayeredCard } from '../../learn/layered'
import { topicById } from '../../learn/topics'
import { useProgress } from '../../state/progress'
import { useViewer } from '../../state/store'
import { useResolvedTheme } from '../../lib/theme'
import { haptic } from '../../lib/feedback'
import { tap } from '../../learn/sound'
import { Annotatable } from '../lessons/Annotatable'
import { ChevronIcon, CubeIcon } from '../Icons'
import { SessionTop } from './SessionTop'

const BoneSnapshot = lazy(() => import('../../viewer/BoneSnapshot'))

/** Due cards first (earliest first), then new cards in deck order. */
function queueOf(cards: LayeredCard[]): LayeredCard[] {
  const stored = useProgress.getState().cards
  const now = new Date().toISOString()
  const due = cards.filter((c) => stored[layeredKey(c)] && stored[layeredKey(c)].due <= now).sort((a, b) => stored[layeredKey(a)].due.localeCompare(stored[layeredKey(b)].due))
  const fresh = cards.filter((c) => !stored[layeredKey(c)])
  return [...due, ...fresh]
}

type Layer = 'why' | 'deeper' | 'clinical'
const LAYERS: Layer[] = ['why', 'deeper', 'clinical']

/** Layered flashcards: question → answer → Why → Go deeper → Clinical, each opened only when wanted. */
export function LayeredSession({ onClose, onShow, cards = LAYERED }: { onClose: () => void; onShow: (bone: string) => void; cards?: LayeredCard[] }) {
  const [q, setQ] = useState<LayeredCard[]>(() => queueOf(cards))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [turning, setTurning] = useState<'out' | 'in' | null>(null)
  const [log, setLog] = useState<{ card: LayeredCard; grade: Grade }[]>([])
  const card = q[idx]
  const stored = card ? useProgress.getState().cards[layeredKey(card)] : undefined
  const ivals = useMemo(() => (card ? intervals(stored) : {}), [card, stored])

  const flip = () => {
    if (revealed || turning) return
    tap()
    haptic('light')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setRevealed(true)
    // Turn the card edge-on, change faces, turn it back.
    setTurning('out')
    window.setTimeout(() => {
      setRevealed(true)
      setTurning('in')
      window.setTimeout(() => setTurning(null), 200)
    }, 170)
  }

  const rate = (grade: Grade) => {
    if (!card) return
    haptic(grade === Rating.Again ? 'medium' : 'light')
    const p = useProgress.getState()
    const isNew = !p.cards[layeredKey(card)]
    p.saveCard(layeredKey(card), review(p.cards[layeredKey(card)], grade), isNew)
    setLog((l) => [...l, { card, grade }])
    if (grade === Rating.Again) setQ((list) => [...list, card]) // once more before the end
    setRevealed(false)
    setIdx((k) => k + 1)
  }

  if (!card) return <LayeredSummary log={log} onClose={onClose} />

  return (
    <div className="mycards-session layered-session">
      <SessionTop title="Flashcards" index={idx} total={q.length} onClose={onClose} />
      <div className="lc-stage">
        <article
          key={`${card.id}:${idx}`}
          className={`lc ${revealed ? 'back' : 'front'} ${turning ? `turn-${turning}` : ''}`}
          aria-label={revealed ? 'Card, answer side' : 'Card, question side'}
        >
          {revealed ? <CardBack card={card} onShow={onShow} /> : <CardFront card={card} onFlip={flip} />}
        </article>
      </div>
      <div className="study-bottom">
        {!revealed ? (
          <button className="btn primary wide" onClick={flip}>
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

function CardTags({ card }: { card: LayeredCard }) {
  return (
    <div className="lc-tags">
      <span className={`tag lvl-${card.level}`}>{LEVEL_NAME[card.level]}</span>
      <span className="lc-type">
        {TYPE_NAME[card.type]} · {topicById(card.topic)?.title ?? card.topic}
      </span>
    </div>
  )
}

function CardFront({ card, onFlip }: { card: LayeredCard; onFlip: () => void }) {
  const theme = useResolvedTheme()
  const sex = useViewer((s) => s.sex)
  return (
    <div className={`lc-face ${card.frontView ? '' : 'no-3d'}`} onClick={(e) => !(e.target as HTMLElement).closest('.lc-3d') && onFlip()}>
      <CardTags card={card} />
      <p className="lc-question">{card.front}</p>
      {card.frontView && (
        <div className="lc-3d q-snapshot" aria-label="3D model with the structure highlighted">
          <Suspense fallback={null}>
            <BoneSnapshot bone={card.bone} theme={theme} sex={sex} elevation={card.elevation} />
          </Suspense>
          <span className="q-snapshot-hint">Drag to turn</span>
        </div>
      )}
      <p className="lc-tap muted small">Tap the card to see the answer</p>
    </div>
  )
}

/** A statement, with a dagger where it still awaits a source check. */
function Said({ f, pid, as: Tag = 'p' }: { f: Fact; pid: string; as?: 'p' | 'li' }) {
  return (
    <Tag data-pid={pid}>
      {f.t}
      {f.check && (
        <sup className="lc-check" title="Awaiting a source check">
          †
        </sup>
      )}
    </Tag>
  )
}

function CardBack({ card, onShow }: { card: LayeredCard; onShow: (bone: string) => void }) {
  const [open, setOpen] = useState<Set<Layer>>(new Set())
  const [simpler, setSimpler] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const touch = useRef<{ y: number; atEnd: boolean } | null>(null)
  const checks = needsReview(card)

  const toggle = (l: Layer) => {
    tap()
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(l)) n.delete(l)
      else n.add(l)
      return n
    })
  }
  const next = LAYERS.find((l) => !open.has(l))
  // Swipe up (once the back is scrolled to its end) opens the next layer.
  const atEnd = () => {
    const el = scroller.current
    return !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 4
  }

  return (
    <div
      className="lc-face lc-scroll"
      ref={scroller}
      onTouchStart={(e) => (touch.current = { y: e.touches[0].clientY, atEnd: atEnd() })}
      onTouchEnd={(e) => {
        const t = touch.current
        touch.current = null
        if (!t || !next || !t.atEnd || window.getSelection()?.toString()) return
        if (t.y - e.changedTouches[0].clientY > 60) {
          haptic('light')
          toggle(next)
          window.setTimeout(() => scroller.current?.scrollBy({ top: 240, behavior: 'smooth' }), 30)
        }
      }}
    >
      <CardTags card={card} />
      <p className="lc-question small">{card.front}</p>
      <Annotatable doc={`fc:${card.id}`} docLabel={`Flashcard: ${card.front}`} className="lc-back">
        <div className="lc-answer">
          <span className="k">Answer</span>
          <p data-pid={`${card.id}-answer`}>{card.answer}</p>
        </div>

        <LayerRow label="Why?" open={open.has('why')} onToggle={() => toggle('why')}>
          {simpler && card.simpler ? <Said f={card.simpler} pid={`${card.id}-simpler`} /> : <Said f={card.why} pid={`${card.id}-why`} />}
          {card.simpler && (
            <button className={`chip lc-simpler ${simpler ? 'on' : ''}`} aria-pressed={simpler} onClick={() => setSimpler((s) => !s)}>
              Explain simpler
            </button>
          )}
        </LayerRow>
        <LayerRow label="Go deeper" open={open.has('deeper')} onToggle={() => toggle('deeper')}>
          <ul className="lc-depth">
            {card.depth.map((d, k) => (
              <Said key={k} f={d} pid={`${card.id}-depth-${k}`} as="li" />
            ))}
          </ul>
        </LayerRow>
        <LayerRow label="Clinical" open={open.has('clinical')} onToggle={() => toggle('clinical')}>
          <Said f={card.clinical} pid={`${card.id}-clinical`} />
        </LayerRow>
        {next && <p className="lc-swipe muted small">Swipe up for the next layer</p>}

        <div className="lc-extras">
          {card.hook && (
            <div className="lc-extra">
              <h3>Memory hook</h3>
              <Said f={card.hook} pid={`${card.id}-hook`} />
            </div>
          )}
          <div className="lc-extra trap">
            <h3>Exam trap</h3>
            <Said f={card.trap} pid={`${card.id}-trap`} />
          </div>
        </div>
      </Annotatable>

      <div className="q-foot lc-foot">
        <button className="btn ghost small q-3d" onClick={() => onShow(card.bone)}>
          <CubeIcon /> See in 3D
        </button>
        <p className="q-source">
          {card.source}
          <span className="review draft">{card.reviewStatus === 'reviewed' ? 'Reviewed' : 'Draft, awaiting academic review'}</span>
        </p>
        {checks.length > 0 && <p className="q-source lc-check-note">† Awaiting a source check before review.</p>}
      </div>
    </div>
  )
}

function LayerRow({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className={`lc-layer ${open ? 'open' : ''}`}>
      <button className="lc-layer-head" aria-expanded={open} onClick={onToggle}>
        <span>{label}</span>
        <ChevronIcon className="lc-chev" />
      </button>
      {open && <div className="lc-layer-body">{children}</div>}
    </section>
  )
}

/** Session summary: cards learnt, levels reached, weakest topics. */
function LayeredSummary({ log, onClose }: { log: { card: LayeredCard; grade: Grade }[]; onClose: () => void }) {
  // A card's last grade in the session counts.
  const last = new Map<string, { card: LayeredCard; grade: Grade }>()
  for (const e of log) last.set(e.card.id, e)
  const final = [...last.values()]
  const learnt = final.filter((e) => e.grade !== Rating.Again)
  const levels = (['core', 'higher', 'distinction'] as CardLevel[]).map((l) => ({ l, n: learnt.filter((e) => e.card.level === l).length })).filter((x) => x.n)
  const misses = new Map<string, number>()
  for (const e of log) if (e.grade === Rating.Again || e.grade === Rating.Hard) misses.set(e.card.topic, (misses.get(e.card.topic) ?? 0) + 1)
  const weakest = [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  return (
    <div className="mycards-session layered-session">
      <SessionTop title="Flashcards" index={log.length} total={log.length} onClose={onClose} />
      <div className="mycards-done lc-summary">
        <p className="eyebrow">Session summary</p>
        <h2>{final.length ? `${learnt.length} of ${final.length} cards learnt` : 'All caught up'}</h2>
        {levels.length > 0 && (
          <p className="muted">
            Levels reached: {levels.map((x) => `${LEVEL_NAME[x.l]} (${x.n})`).join(', ')}.
          </p>
        )}
        {weakest.length > 0 && <p className="muted">Weakest: {weakest.map(([t]) => topicById(t)?.title ?? t).join(' and ')}. These cards come back sooner.</p>}
        <button className="btn primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
