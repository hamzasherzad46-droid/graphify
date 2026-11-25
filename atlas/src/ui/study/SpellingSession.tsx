import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Rating } from 'ts-fsrs'
import type { Bone } from '../../data/types'
import { usePrefs, useViewer } from '../../state/store'
import { useHud } from '../../state/hud'
import { useProgress } from '../../state/progress'
import { mmss } from '../../learn/session'
import { shuffle, nameKey } from '../../learn/pool'
import { review } from '../../learn/deck'
import { answersFor, everydayFor, friendlyIn, hint, isKnown, press, setBones, SETS, setById, targetFor, type SpellingSet } from '../../learn/spelling'
import { sessionChord, wordChime, wrongLetter } from '../../learn/sound'
import { Choice, Group } from '../Settings'
import { haptic } from '../../lib/feedback'
import { thumbSlots } from '../../viewer/thumbSlots'
import { CloseIcon, ChevronRightIcon } from '../Icons'
import { Keyboard, type KeyName, type KeyOutcome } from './Keyboard'

type SpellMode = 'learn' | 'hard'

/** One bone's result. Known = finished with no hints and at most one wrong key (see isKnown). */
export interface SpellResult {
  bone: Bone
  typed: string
  errors: number
  hints: number
  /** Letters (indexes into `typed`, or into the name if skipped) that a wrong key or a hint fell on. */
  slips: number[]
  skipped: boolean
  done: boolean
  ms: number
}

interface Run {
  set: SpellingSet
  bones: Bone[]
  /** Practising the bones missed in the previous round of this set. */
  retry: boolean
}

const TIMERS: [number, string][] = [
  [0, 'None'],
  [60, '1 min'],
  [180, '3 min'],
  [300, '5 min'],
]
const AUTO_NEXT_MS = 1500
const AUTO_NEXT_SKIPPED_MS = 2200

const TYPE_LABEL: Record<Bone['type'], string> = { long: 'Long bone', short: 'Short bone', flat: 'Flat bone', irregular: 'Irregular bone', sesamoid: 'Sesamoid bone' }
/** Learn mode's one-line description: kind of bone, where it is, which side. */
const describe = (b: Bone) => [TYPE_LABEL[b.type], b.subregion ?? b.region, b.side === 'midline' ? 'midline' : `${b.side} side`].join(' · ')

const startRun = (set: SpellingSet, bones = setBones(set), retry = false): Run => ({ set, bones: shuffle(bones), retry })

/**
 * Spelling Quiz: focused sets (content/sets.json), spelled letter by letter on the in-app keyboard, with the bone
 * lit in the 3D view and two slowly turning side views. Setup → run → end screen.
 */
export function SpellingSession({ onClose, onShow, autostart }: { onClose: () => void; onShow: (id: string) => void; autostart: boolean }) {
  const study = usePrefs((s) => s.study)
  const mode: SpellMode = study.spellMode ?? 'learn'
  const set = setById(study.spellSet ?? '') ?? SETS[0]
  const [run, setRun] = useState<Run | null>(() => (autostart ? startRun(set) : null))
  const [round, setRound] = useState(0)
  const [end, setEnd] = useState<{ results: SpellResult[]; ms: number; timeUp: boolean } | null>(null)

  const begin = (r: Run) => {
    usePrefs.getState().setStudy({ spellSet: r.set.id })
    setEnd(null)
    setRun(r)
    setRound((n) => n + 1)
  }

  if (!run) return <SpellingSetup current={set.id} mode={mode} timeLimit={study.timeLimit} onStart={(s) => begin(startRun(s))} onClose={onClose} />
  if (end)
    return (
      <SpellingEnd
        run={run}
        {...end}
        onShow={onShow}
        onClose={onClose}
        onRetry={(missed) => begin(startRun(run.set, missed, true))}
        onNext={() => begin(startRun(SETS[(SETS.indexOf(run.set) + 1) % SETS.length]))}
        onSets={() => {
          setEnd(null)
          setRun(null)
        }}
      />
    )
  return (
    <SpellingRun
      key={round}
      run={run}
      mode={mode}
      timeLimit={study.timeLimit}
      onClose={onClose}
      onEnd={(results, ms, timeUp) => {
        useViewer.getState().setHighlight(null, false)
        useViewer.getState().setThumbs(null)
        if (results.length)
          useProgress.getState().addSession({
            mode: 'typing',
            area: 'all',
            set: run.set.id,
            answered: results.length,
            correct: results.filter(isKnown).length,
            ms,
            at: new Date().toISOString(),
          })
        setEnd({ results, ms, timeUp })
      }}
    />
  )
}

/* ───────────────────────────── Setup ───────────────────────────── */

function bestFor(setId: string): number | null {
  const s = useProgress.getState().sessions.filter((x) => x.mode === 'typing' && x.set === setId && x.answered)
  return s.length ? Math.max(...s.map((x) => x.correct / x.answered)) : null
}

function SpellingSetup({ current, mode, timeLimit, onStart, onClose }: { current: string; mode: SpellMode; timeLimit: number; onStart: (s: SpellingSet) => void; onClose: () => void }) {
  const set = (x: Parameters<ReturnType<typeof usePrefs.getState>['setStudy']>[0]) => usePrefs.getState().setStudy(x)
  const regions = useMemo(() => [...new Set(SETS.map((s) => s.region))], [])
  return (
    <div className="spell-setup" role="dialog" aria-label="Spelling Quiz: choose a set">
      <header className="sp-top">
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
        <span className="sp-title">Spelling Quiz</span>
        <span className="sp-top-gap" />
      </header>
      <div className="spell-setup-body">
        <p className="muted">Choose a small set. Each bone lights up in 3D; spell its name letter by letter.</p>
        <Group>
          <Choice
            label="Mode"
            hint={mode === 'learn' ? 'The name shows as faint letters to trace, with a short description.' : 'Blanks only, with no description.'}
            value={mode}
            options={[
              ['learn', 'Learn'],
              ['hard', 'Hard'],
            ]}
            onChange={(spellMode) => set({ spellMode })}
          />
          <Choice label="Timer" hint="Time for the whole set" value={timeLimit} options={TIMERS} onChange={(v) => set({ timeLimit: v })} />
        </Group>
        {regions.map((r) => (
          <section key={r} className="set-group">
            <h3 className="sheet-sub">{r}</h3>
            <ul className="sets">
              {SETS.filter((s) => s.region === r).map((s) => {
                const best = bestFor(s.id)
                const last = s.id === current && best !== null
                return (
                  <li key={s.id}>
                    <button className={`set-row ${last ? 'last' : ''}`} onClick={() => onStart(s)}>
                      <span className="set-title">{s.title}</span>
                      <span className="set-meta">
                        {s.bones.length} bones
                        {best !== null && <span className={`set-best ${best >= 0.8 ? 'good' : ''}`}> · Best {Math.round(best * 100)}%</span>}
                        {last && <span className="set-last"> · Last played</span>}
                      </span>
                      <ChevronRightIcon className="row-go" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────── Run ───────────────────────────── */

type Status = 'typing' | 'correct' | 'skipped'
interface Cur {
  typed: string
  errors: number
  hints: number
  slips: number[]
  status: Status
}
const fresh = (): Cur => ({ typed: '', errors: 0, hints: 0, slips: [], status: 'typing' })
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
/** Index of the next letter to type in `target` after `typed` (skipping a space). */
const nextLetter = (target: string, typed: string) => (target[typed.length] === ' ' ? typed.length + 1 : typed.length)
const addSlip = (slips: number[], k: number) => (slips.includes(k) ? slips : [...slips, k])

function SpellingRun({ run, mode, timeLimit, onEnd, onClose }: {
  run: Run
  mode: SpellMode
  timeLimit: number
  onEnd: (results: SpellResult[], ms: number, timeUp: boolean) => void
  onClose: () => void
}) {
  const loaded = useViewer((s) => s.loaded)
  const items = run.bones
  const [i, setI] = useState(0)
  const [cur, setCur] = useState<Cur>(fresh)
  const curRef = useRef<Cur>(cur)
  const [reject, setReject] = useState<{ ch: string; n: number } | null>(null)
  const [results, setResults] = useState<SpellResult[]>([])
  const resultsRef = useRef<SpellResult[]>([])
  const streak = useRef(0)
  const [clock, setClock] = useState(0)
  const t0 = useRef(0)
  const qStart = useRef(0)
  const ended = useRef(false)
  const stage = useRef<HTMLDivElement>(null)
  const lateral = useRef<HTMLDivElement>(null)
  const posterior = useRef<HTMLDivElement>(null)
  const advance = useRef(0)
  const bottom = useRef<HTMLDivElement>(null)
  const [bottomH, setBottomH] = useState(0)
  const bone = items[i]
  const answers = useMemo(() => answersFor(bone), [bone])
  const everyday = useMemo(() => everydayFor(bone), [bone])
  // A short note under the word: "Kneecap is the everyday name …".
  const [note, setNote] = useState<{ text: string; n: number } | null>(null)

  const update = (c: Cur) => {
    curRef.current = c
    setCur(c)
  }

  // The 3D view frames the free stage between the header and the answer area, clear of the side views.
  useLayoutEffect(() => {
    const measure = () => {
      const r = stage.current?.getBoundingClientRect()
      const side = lateral.current?.getBoundingClientRect()
      if (!r) return
      useHud.setState({ studyInsets: { top: r.top, bottom: window.innerHeight - r.bottom, side: side ? side.right + 6 : 0 } })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // The keyboard shows at mount: its height becomes the bottom area's minimum, so the answer card that replaces it
  // doesn't move the 3D view.
  useLayoutEffect(() => {
    const h = bottom.current?.getBoundingClientRect().height ?? 0
    if (h) setBottomH(h)
  }, [])

  // Register the side-view boxes with the 3D view.
  useLayoutEffect(() => {
    thumbSlots.lateral = lateral.current
    thumbSlots.posterior = posterior.current
    return () => {
      thumbSlots.lateral = null
      thumbSlots.posterior = null
      useViewer.getState().setThumbs(null)
    }
  }, [])

  // Clock: counts down with a timer, up without.
  useEffect(() => {
    const id = window.setInterval(() => t0.current && setClock((performance.now() - t0.current) / 1000), 250)
    return () => window.clearInterval(id)
  }, [])

  // Each bone: light it, fly to it, show it in the side views.
  useEffect(() => {
    if (!bone || !loaded) return
    qStart.current = performance.now()
    if (!t0.current) t0.current = qStart.current
    const v = useViewer.getState()
    v.setHighlight({ target: [bone.id] }, 'close')
    v.setThumbs(bone.id)
  }, [bone, loaded])

  useEffect(() => () => window.clearTimeout(advance.current), [])

  const finish = (timeUp: boolean) => {
    if (ended.current) return
    ended.current = true
    window.clearTimeout(advance.current)
    onEnd(resultsRef.current, t0.current ? performance.now() - t0.current : 0, timeUp)
  }

  const next = () => {
    window.clearTimeout(advance.current)
    if (curRef.current.status === 'typing') return
    if (i + 1 >= items.length) finish(false)
    else {
      update(fresh())
      setReject(null)
      setNote(null)
      setI(i + 1)
    }
  }
  const nextRef = useRef(next)
  useEffect(() => {
    nextRef.current = next
  })

  /** A bone is finished (spelled or skipped): record it, grade its FSRS card, sound, and maybe auto-advance. */
  const complete = (c: Cur, skipped: boolean) => {
    const r: SpellResult = { bone, typed: skipped ? answers[0] : c.typed, errors: c.errors, hints: c.hints, slips: c.slips, skipped, done: !skipped, ms: performance.now() - qStart.current }
    const known = isKnown(r)
    resultsRef.current = [...resultsRef.current, r]
    setResults(resultsRef.current)
    const p = useProgress.getState()
    p.record(bone.id, known)
    // FSRS: the bone's "name it" flashcard. Clean = Good, one slip = Hard, help or skip = Again.
    const id = `see:${nameKey(bone)}`
    const grade = !known ? Rating.Again : r.errors === 0 ? Rating.Good : Rating.Hard
    p.saveCard(id, review(p.cards[id], grade, new Date(), { longTerm: true }), false)
    if (skipped) {
      streak.current = 0
      wrongLetter()
      haptic('error')
    } else {
      streak.current = known ? streak.current + 1 : 0
      wordChime(streak.current)
      haptic('success')
    }
    update({ ...c, status: skipped ? 'skipped' : 'correct' })
    if (timeLimit) {
      const at = i
      advance.current = window.setTimeout(() => {
        if (!ended.current && at === iRef.current) nextRef.current()
      }, skipped ? AUTO_NEXT_SKIPPED_MS : AUTO_NEXT_MS)
    }
  }
  const iRef = useRef(i)
  useEffect(() => {
    iRef.current = i
  }, [i])

  const onKey = (k: KeyName): KeyOutcome => {
    const c = curRef.current
    if (c.status !== 'typing' || !bone) return 'none'
    if (k === 'back') {
      if (!c.typed) return 'none'
      update({ ...c, typed: c.typed.slice(0, -1).replace(/ $/, '') })
      return 'ok'
    }
    if (k === 'skip') {
      complete(c, true)
      return 'ok'
    }
    if (k === 'hint') {
      const h = hint(answers, c.typed)
      if (!h.ok) return 'none'
      setNote(null)
      const n = { ...c, typed: h.typed, hints: c.hints + 1, errors: c.errors + 1, slips: addSlip(c.slips, h.typed.length - 1) }
      if (h.done) complete(n, false)
      else update(n)
      return 'ok'
    }
    const r = press(answers, c.typed, k, everyday)
    if (!r.ok && r.everyday) {
      // Knowing the everyday name is not a spelling mistake: no error, just a pointer to the anatomical name.
      setNote((p) => ({ text: `“${cap(r.everyday!)}” is the everyday name. Spell the anatomical name.`, n: (p?.n ?? 0) + 1 }))
      return 'note'
    }
    if (!r.ok) {
      update({ ...c, errors: c.errors + 1, slips: addSlip(c.slips, nextLetter(r.target, c.typed)) })
      setReject((p) => ({ ch: k === ' ' ? '␣' : k, n: (p?.n ?? 0) + 1 }))
      return 'wrong'
    }
    setReject(null)
    setNote(null)
    const n = { ...c, typed: r.typed }
    if (r.done) complete(n, false)
    else update(n)
    return 'ok'
  }

  // Enter moves on after an answer (physical keyboard).
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && curRef.current.status !== 'typing') {
        e.preventDefault()
        nextRef.current()
      }
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [])

  // The rejected letter fades after its shake.
  useEffect(() => {
    if (!reject) return
    const id = window.setTimeout(() => setReject(null), 420)
    return () => window.clearTimeout(id)
  }, [reject])

  // Time up.
  const remaining = timeLimit ? timeLimit - clock : 0
  useEffect(() => {
    if (timeLimit && t0.current && remaining <= 0) finish(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  if (!bone) return null
  const target = cur.status === 'skipped' ? answers[0] : targetFor(answers, cur.typed)
  const shown = cur.status === 'skipped' ? '' : cur.typed
  const officialDiffers = cur.status === 'correct' && cur.typed !== answers[0]
  const slipped = new Set(cur.status === 'typing' ? [] : cur.slips)
  const fontPx = Math.min(40, Math.floor((Math.min(window.innerWidth, 560) - 40) / (target.length * 0.62)))
  const progress = (i + (cur.status === 'typing' ? 0 : 1)) / items.length

  return (
    <div className="spell" data-status={cur.status}>
      <header className="sp-top">
        <button className="icon-btn" aria-label="End session" onClick={onClose}>
          <CloseIcon />
        </button>
        <span className="sp-title" aria-label={`Spelling Quiz, bone ${i + 1} of ${items.length}`}>
          Spelling Quiz · {i + 1}/{items.length}
        </span>
        <span className={`sp-clock ${timeLimit && remaining <= 10 ? 'low' : ''}`} aria-label={timeLimit ? 'Time left' : 'Time'}>
          {timeLimit ? mmss(remaining) : mmss(clock)}
        </span>
        <span className="sp-progress" aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </span>
      </header>

      <div className="sp-stage" ref={stage}>
        <figure className="sp-thumb left">
          <div className="sp-thumb-box" ref={lateral} />
          <figcaption>Lateral</figcaption>
        </figure>
        <figure className="sp-thumb right">
          <div className="sp-thumb-box" ref={posterior} />
          <figcaption>Posterior</figcaption>
        </figure>
        {run.retry && <span className="sp-retry">Practising missed bones</span>}
      </div>

      <section className="sp-answer" aria-live="polite">
        <p className="sp-ask">Name the highlighted structure</p>
        <p className={`sp-word ${cur.status}`} style={{ fontSize: `${fontPx}px` }} aria-label={cur.status === 'typing' ? `Typed: ${cur.typed || 'nothing yet'}` : target}>
          <span key={reject?.n ?? 0} className={reject ? 'sp-letters shake' : 'sp-letters'}>
            {[...target].map((ch, k) => {
              if (ch === ' ') return <span key={k} className="sp-gap" />
              const slip = slipped.has(k) ? ' slip' : ''
              if (k < shown.length) return <span key={k} className={`sp-l typed${slip}`}>{k === 0 ? ch.toUpperCase() : ch}</span>
              if (cur.status === 'skipped') return <span key={k} className="sp-l reveal">{k === 0 ? ch.toUpperCase() : ch}</span>
              const isCursor = k === shown.length || (k === shown.length + 1 && target[shown.length] === ' ')
              return (
                <span key={k} className={`sp-l ${mode === 'learn' ? 'ghost' : 'blank'} ${isCursor ? 'cursor' : ''} ${isCursor && reject ? 'rej' : ''}`}>
                  <span className="g">{mode === 'learn' ? (k === 0 ? ch.toUpperCase() : ch) : '_'}</span>
                  {isCursor && reject && <span className="sp-reject">{reject.ch}</span>}
                </span>
              )
            })}
          </span>
        </p>
        {cur.status === 'typing' && note && (
          <p className="sp-desc sp-lay" key={note.n} role="status">
            {note.text}
          </p>
        )}
        {cur.status === 'typing' && !note && mode === 'learn' && <p className="sp-desc">{describe(bone)}</p>}
        {cur.status === 'typing' && !note && mode === 'hard' && <p className="sp-desc" aria-hidden>{'\u00a0'}</p>}
        {cur.status === 'correct' && (
          <p className="sp-verdict good">
            ✓ Correct · Errors: {cur.errors}
            {cur.hints ? ` (${cur.hints} ${cur.hints === 1 ? 'hint' : 'hints'})` : ''}
          </p>
        )}
        {cur.status === 'correct' && slipped.size > 0 && (
          <p className="sp-slip-help">
            <span className="sp-slip-key" aria-hidden /> {slipped.size === 1 ? 'The letter you slipped on' : 'The letters you slipped on'}
          </p>
        )}
        {cur.status === 'skipped' && <p className="sp-verdict bad">Skipped · added to Weak Bones</p>}
      </section>

      <div className="sp-bottom" ref={bottom} style={bottomH ? { minHeight: bottomH } : undefined}>
      {cur.status === 'typing' ? (
        <Keyboard onKey={onKey} />
      ) : (
        <section className="sp-result">
          {officialDiffers && <p className="sp-official">Standard name: {bone.name}</p>}
          {everyday.length > 0 && <p className="sp-official">Everyday name: {everyday.join(', ')}</p>}
          <p className="sp-latin">
            <em>{bone.latin}</em>
            {bone.side !== 'midline' && <span className="muted"> · {bone.side}</span>}
          </p>
          {bone.clinical && (
            <div className="sp-note">
              <span className="k">Clinical note</span>
              <p>{bone.clinical}</p>
            </div>
          )}
          <button className="btn primary wide sp-next" onClick={next}>
            {i + 1 >= items.length ? 'See results' : 'Next'}
            {timeLimit ? <span className="sp-auto" key={i} /> : null}
          </button>
        </section>
      )}
      </div>
      <span className="sr-only" aria-live="polite">
        {results.length ? `${results.filter(isKnown).length} known so far` : ''}
      </span>
    </div>
  )
}

/* ───────────────────────────── End ───────────────────────────── */

/** A spelled name with the letters the student slipped on underlined. */
function Marked({ text, slips }: { text: string; slips: number[] }) {
  return (
    <span className="marked" aria-label={text}>
      {[...text].map((ch, k) => (
        <span key={k} className={slips.includes(k) ? 'slip' : undefined}>
          {k === 0 ? ch.toUpperCase() : ch}
        </span>
      ))}
    </span>
  )
}

function SpellingEnd({ run, results, ms, timeUp, onShow, onClose, onRetry, onNext, onSets }: {
  run: Run
  results: SpellResult[]
  ms: number
  timeUp: boolean
  onShow: (id: string) => void
  onClose: () => void
  onRetry: (missed: Bone[]) => void
  onNext: () => void
  onSets: () => void
}) {
  const [now] = useState(() => Date.now())
  useEffect(() => {
    sessionChord()
    haptic('success')
  }, [])
  const total = run.bones.length
  const known = results.filter(isKnown)
  const missed = results.filter((r) => !isKnown(r))
  const notReached = run.bones.slice(results.length)
  const errors = results.reduce((s, r) => s + r.errors, 0)
  const acc = total ? Math.round((known.length / total) * 100) : 0
  const mastered = !timeUp && known.length === total
  const nextSet = SETS[(SETS.indexOf(run.set) + 1) % SETS.length]

  const statement = mastered
    ? run.retry
      ? `You can now spell the ${total === 1 ? 'bone' : `${total} bones`} you missed.`
      : run.set.statement
    : timeUp
      ? `Time ran out after ${results.length} of ${total}. You named ${known.length} without help.`
      : known.length / total >= 0.8
        ? `Nearly there: ${known.length} of ${total} named without help.`
        : `You named ${known.length} of ${total} without help. The rest are in Weak Bones.`

  // FSRS: when these bones' "name it" cards come back. The earliest of the well-known ones, so the line is about
  // what was learnt; missed bones come back sooner and are listed below.
  const cards = useProgress.getState().cards
  const dueOf = (rs: SpellResult[]) =>
    rs
      .map((r) => cards[`see:${nameKey(r.bone)}`]?.due)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime())
  const knownDue = dueOf(known)
  const reviewLine = knownDue.length ? `Review again ${friendlyIn(Math.min(...knownDue) - now)}` : 'Review again today, after practising the missed bones'

  const toPractise = [...missed.map((r) => r.bone), ...notReached]
  // Known bones that still had a slip: the letter is worth a second look.
  const watch = known.filter((r) => r.slips.length > 0)

  return (
    <div className="spell-end" role="dialog" aria-label="Spelling Quiz results">
      <header className="sp-top">
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
        <span className="sp-title">{run.retry ? 'Practise missed' : run.set.title}</span>
        <span className="sp-top-gap" />
      </header>
      <div className="spell-end-body">
        <p className={`end-statement ${mastered ? 'good' : ''}`}>{statement}</p>
        <div className="stats">
          <div>
            <span className="num">{acc}%</span>
            <span className="k">Accuracy</span>
          </div>
          <div>
            <span className="num">{mmss(ms / 1000)}</span>
            <span className="k">Time</span>
          </div>
          <div>
            <span className="num">{errors}</span>
            <span className="k">Errors</span>
          </div>
        </div>
        <p className="end-review">
          <span className="end-dot" aria-hidden />
          {reviewLine}
          <span className="muted small"> · FSRS</span>
        </p>
        {watch.length > 0 && (
          <>
            <h3 className="sheet-sub">Watch these letters</h3>
            <ul className="mistakes">
              {watch.map((r) => (
                <li key={r.bone.id}>
                  <div>
                    <strong>
                      <Marked text={r.typed} slips={r.slips} />
                    </strong>
                    <span className="muted small">Known, with one slip</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {toPractise.length > 0 && (
          <>
            <h3 className="sheet-sub">Missed</h3>
            <ul className="mistakes">
              {missed.map((r) => (
                <li key={r.bone.id}>
                  <div>
                    <strong>
                      <Marked text={r.typed} slips={r.slips} />
                    </strong>
                    <span className="muted small">
                      {r.skipped ? 'Skipped' : [r.errors && `${r.errors} ${r.errors === 1 ? 'error' : 'errors'}`, r.hints && `${r.hints} ${r.hints === 1 ? 'hint' : 'hints'}`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button className="link-btn" onClick={() => onShow(r.bone.id)}>
                    Show me in 3D
                  </button>
                </li>
              ))}
              {notReached.map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>{b.name}</strong>
                    <span className="muted small">Not reached</span>
                  </div>
                  <button className="link-btn" onClick={() => onShow(b.id)}>
                    Show me in 3D
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="end-actions">
        {toPractise.length > 0 ? (
          <button className="btn primary" onClick={() => onRetry(toPractise)}>
            Practise missed
          </button>
        ) : (
          <button className="btn ghost" onClick={onSets}>
            All sets
          </button>
        )}
        <button className={`btn ${toPractise.length ? 'ghost' : 'primary'}`} onClick={onNext} aria-label={`Next set: ${nextSet.title}`}>
          Next set
        </button>
      </div>
    </div>
  )
}
