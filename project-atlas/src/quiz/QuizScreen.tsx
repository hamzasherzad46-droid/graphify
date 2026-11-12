import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { noteFor } from '../content/notes'
import { useModule } from '../content/useModule'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import { meshKeys } from '../lib/meshMatch'
import { activeAnswer, type KeyInput } from '../lib/typing'
import { comboMultiplier } from '../lib/xp'
import { useNav, type SessionConfig } from '../state/nav'
import { accuracyOf, useQuiz } from '../state/quiz'
import { useSettings } from '../state/settings'
import { AnswerWord } from './AnswerWord'
import { Keyboard } from './Keyboard'
import { SessionSummary } from './SessionSummary'
import './quiz.css'

const AnatomyViewer = lazy(() => import('../viewer/AnatomyViewer'))

export const AUTO_ADVANCE_MS = 1400

export function QuizScreen({ config }: { config: SessionConfig }) {
  const t = useT()
  const { assets, error } = useModule(config.moduleId)
  const endSession = useNav((s) => s.endSession)
  const q = useQuiz()
  const track = useSettings((s) => s.track)
  // Index of the question whose auto-advance the student paused by tapping.
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (assets) useQuiz.getState().init(config, assets.content.structures)
  }, [assets, config])

  const ready = q.config === config
  const current = ready ? q.byId[q.queue[q.index]] : undefined
  const prev = ready && q.index > 0 ? q.byId[q.queue[q.index - 1]] : undefined
  const next = ready ? q.byId[q.queue[q.index + 1]] : undefined
  const done = q.phase === 'done'
  const paused = pausedAt === q.index

  useEffect(() => {
    if (!done || paused) return
    const tm = setTimeout(() => useQuiz.getState().next(), q.lastOutcome === 'failed' ? AUTO_ADVANCE_MS + 900 : AUTO_ADVANCE_MS)
    return () => clearTimeout(tm)
  }, [done, paused, q.index, q.lastOutcome])

  // Clocks: whole-exam limit and per-question timer.
  const ticking = q.phase !== 'finished' && (q.endsAt !== null || q.qDeadline !== null)
  useEffect(() => {
    if (!ticking) return
    const tm = setInterval(() => {
      const st = useQuiz.getState()
      const n = Date.now()
      setNow(n)
      if (st.endsAt && n >= st.endsAt) st.finish()
      else if (st.qDeadline && n >= st.qDeadline) st.timeout()
    }, 100)
    return () => clearInterval(tm)
  }, [ticking])

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

  if (error) return <div className="quiz quiz-center muted">{t('quiz.error')}</div>
  if (!assets || !ready) return <div className="quiz quiz-center muted">{t('common.loading')}</div>
  if (q.phase === 'finished' || !current) return <SessionSummary />

  const answer = done && q.lastOutcome === 'failed' ? q.answers[0] : activeAnswer(q.typing.buffer, q.answers)
  const examLeft = q.endsAt ? Math.max(0, q.endsAt - now) : null
  const qLeft = q.qDeadline ? Math.max(0, q.qDeadline - now) : null
  const qFrac = qLeft !== null && config.answerTimer ? qLeft / (config.answerTimer * 1000) : null
  const note = noteFor(current, track)
  const showDefinition = config.mode === 'learn' || done
  const mult = comboMultiplier(q.streak)

  return (
    <div className="quiz">
      <header className="quiz-top">
        <button className="quiz-close" onClick={endSession} aria-label={t('quiz.end')}>
          ✕
        </button>
        <span className="kicker">{t('quiz.plate', { a: Math.min(q.index + 1, q.queue.length), b: q.queue.length })}</span>
        <span className="quiz-stat mono">
          {accuracyOf(q.keysCorrect, q.keysWrong)}% <span className="muted">{t('quiz.acc')}</span>
        </span>
        <span className="quiz-stat mono">
          <span className="xp-pill">{q.sessionXp} XP</span>
        </span>
        {examLeft !== null && <span className={`quiz-stat mono${examLeft < 30_000 ? ' low' : ''}`}>{formatClock(examLeft)}</span>}
      </header>
      <div className="timer-track" aria-hidden>
        {qFrac !== null && <span className={`timer-fill${qFrac < 0.3 ? ' low' : ''}`} style={{ transform: `scaleX(${qFrac})` }} />}
      </div>

      <div className="quiz-viewer viewer-fade">
        {mult > 1 && !done && (
          <span className="stamp combo-stamp" key={q.streak}>
            {t('quiz.combo', { n: mult })}
          </span>
        )}
        <Suspense fallback={null}>
          <AnatomyViewer assets={assets} highlight={highlight} view={current.camera} ghosts={{ prev, next, index: q.index }} />
        </Suspense>
      </div>

      <section className="quiz-answer" onPointerDown={() => done && setPausedAt(q.index)}>
        <AnswerWord answer={answer} typed={q.typing.buffer} mode={config.mode} done={done} outcome={q.lastOutcome} wrongCount={q.wrongCount} />
        {done ? (
          <div className="quiz-feedback" key={q.index}>
            <div className="feedback-row">
              <span className={`stamp feedback-stamp ${q.lastOutcome === 'failed' ? 'bad' : 'good'}`}>
                {q.lastOutcome === 'perfect'
                  ? t('quiz.correct')
                  : q.lastOutcome === 'ok'
                    ? t('quiz.errors', { n: q.qErrors })
                    : q.timedOut
                      ? t('quiz.timeout')
                      : t('quiz.skipped')}
              </span>
              {q.lastXp > 0 && <span className="xp-float mono">+{q.lastXp} XP</span>}
            </div>
            {current.latinName.toLowerCase() !== current.name.toLowerCase() && <span className="quiz-latin serif">{current.latinName}</span>}
            <p className="quiz-def">{current.function}</p>
            {note && <p className="quiz-note">{note.text}</p>}
            {paused && (
              <button className="btn btn-line quiz-next" onClick={() => useQuiz.getState().next()}>
                {t('quiz.next')} <span className="flip-rtl">→</span>
              </button>
            )}
          </div>
        ) : (
          <div className="quiz-feedback">
            <p className="quiz-def">{showDefinition ? current.definition : ' '}</p>
            {q.typing.awaitingEnter && <p className="quiz-hint">{t('quiz.confirm')}</p>}
          </div>
        )}
      </section>

      <Keyboard flash={q.flash} onKey={onKey} onSkip={onSkip} awaitingEnter={q.typing.awaitingEnter} disabled={done} labels={{ hint: t('quiz.hint'), skip: t('quiz.skip'), space: t('quiz.space') }} />
    </div>
  )
}
