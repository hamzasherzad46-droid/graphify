import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useModule } from '../content/useModule'
import { activeAnswer, type KeyInput } from '../lib/typing'
import { formatClock } from '../lib/format'
import { meshKeys } from '../lib/meshMatch'
import { useNav, type SessionConfig } from '../state/nav'
import { accuracyOf, useQuiz } from '../state/quiz'
import { useSettings } from '../state/settings'
import { AnswerWord } from './AnswerWord'
import { Keyboard } from './Keyboard'
import { SessionSummary } from './SessionSummary'
import './quiz.css'

const AnatomyViewer = lazy(() => import('../viewer/AnatomyViewer'))

export const AUTO_ADVANCE_MS = 1200

export function QuizScreen({ config }: { config: SessionConfig }) {
  const { assets, error } = useModule(config.moduleId)
  const endSession = useNav((s) => s.endSession)
  const q = useQuiz()
  const track = useSettings((s) => s.track)
  // Index of the question whose auto-advance the student paused by tapping.
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Start the session once the module content is loaded.
  useEffect(() => {
    if (assets) useQuiz.getState().init(config, assets.content.structures)
  }, [assets, config])

  const ready = q.config === config
  const current = ready ? q.byId[q.queue[q.index]] : undefined
  const prev = ready && q.index > 0 ? q.byId[q.queue[q.index - 1]] : undefined
  const next = ready ? q.byId[q.queue[q.index + 1]] : undefined
  const done = q.phase === 'done'
  const paused = pausedAt === q.index

  // Auto-advance after a short pause; tapping the info card pauses it.
  useEffect(() => {
    if (!done || paused) return
    const t = setTimeout(() => useQuiz.getState().next(), AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [done, paused, q.index])

  // Assessment timer.
  useEffect(() => {
    if (!q.endsAt || q.phase === 'finished') return
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= (useQuiz.getState().endsAt ?? Infinity)) useQuiz.getState().finish()
    }, 250)
    return () => clearInterval(t)
  }, [q.endsAt, q.phase])

  // Physical keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const st = useQuiz.getState()
      if (e.key === 'Escape') return endSession()
      if (e.key === 'Backspace') st.press({ type: 'backspace' })
      else if (e.key === 'Enter') st.press({ type: 'enter' })
      else if (e.key === '?') st.press({ type: 'hint' })
      else if (e.key.length === 1) st.press({ type: 'char', char: e.key })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [endSession])

  const highlight = useMemo(() => (current ? meshKeys(current.meshName) : []), [current])
  const onKey = useCallback((input: KeyInput) => useQuiz.getState().press(input), [])
  const onSkip = useCallback(() => useQuiz.getState().skip(), [])

  if (error) return <div className="quiz quiz-center muted">Couldn’t load this module. {error}</div>
  if (!assets || !ready) return <div className="quiz quiz-center muted">Loading…</div>
  if (q.phase === 'finished' || !current) return <SessionSummary />

  const answer = done && q.lastOutcome === 'failed' ? q.answers[0] : activeAnswer(q.typing.buffer, q.answers)
  const remaining = q.endsAt ? Math.max(0, q.endsAt - now) : null
  const note = track === 'nursing' ? current.nursingNote : current.medicineNote
  const showDefinition = config.mode === 'learn' || done

  return (
    <div className="quiz">
      <header className="quiz-stats">
        <button className="quiz-close" onClick={endSession} aria-label="End session">
          ✕
        </button>
        <span>
          <b>{Math.min(q.index + 1, q.queue.length)}</b>
          <span className="muted">/{q.queue.length}</span>
        </span>
        <span>
          <b>{accuracyOf(q.keysCorrect, q.keysWrong)}%</b> <span className="muted">acc</span>
        </span>
        {remaining !== null ? (
          <span className={remaining < 30_000 ? 'quiz-timer-low' : ''}>
            <b>{formatClock(remaining)}</b>
          </span>
        ) : (
          <span>
            <b>{q.streak}</b> <span className="muted">streak</span>
          </span>
        )}
      </header>

      <div className="quiz-viewer viewer-fade">
        <Suspense fallback={null}>
          <AnatomyViewer
            assets={assets}
            highlight={highlight}
            view={current.camera}
            ghosts={{ prev, next, index: q.index }}
          />
        </Suspense>
      </div>

      <section className="quiz-answer" onPointerDown={() => done && setPausedAt(q.index)}>
        <AnswerWord
          answer={answer}
          typed={q.typing.buffer}
          mode={config.mode}
          done={done}
          outcome={q.lastOutcome}
          wrongCount={q.wrongCount}
        />
        {done ? (
          <div className="quiz-feedback" key={q.index}>
            <span className={`quiz-badge ${q.lastOutcome === 'failed' ? 'bad' : 'good'}`}>
              {q.lastOutcome === 'perfect' ? '✓ Correct' : q.lastOutcome === 'ok' ? `✓ ${q.qErrors} ${q.qErrors === 1 ? 'error' : 'errors'}` : 'Skipped'}
            </span>
            {track === 'medicine' && current.latinName.toLowerCase() !== current.name.toLowerCase() && (
              <span className="quiz-latin serif">{current.latinName}</span>
            )}
            <p className="quiz-def">{current.definition}</p>
            <p className="quiz-note">{note}</p>
            {paused && (
              <button className="btn btn-ghost quiz-next" onClick={() => useQuiz.getState().next()}>
                Next →
              </button>
            )}
          </div>
        ) : (
          <div className="quiz-feedback">
            <p className="quiz-def">{showDefinition ? current.definition : ' '}</p>
            {q.typing.awaitingEnter && <p className="quiz-hint">Press ↵ to confirm, or keep typing</p>}
          </div>
        )}
      </section>

      <Keyboard flash={q.flash} onKey={onKey} onSkip={onSkip} awaitingEnter={q.typing.awaitingEnter} disabled={done} />
    </div>
  )
}
