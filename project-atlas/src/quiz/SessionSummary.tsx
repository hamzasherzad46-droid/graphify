import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import { useNav } from '../state/nav'
import { accuracyOf, useQuiz } from '../state/quiz'

/** Counts up to `to` for a satisfying tally. */
function useCountUp(to: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (n: number) => {
      const k = Math.min(1, (n - start) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return v
}

export function SessionSummary() {
  const t = useT()
  const q = useQuiz()
  const { endSession, startSession } = useNav()
  const config = q.config!
  const isAssessment = config.kind === 'assessment'

  // Anything answered imperfectly at least once this session (or unanswered in a timed test) is listed for review.
  const unique = [...new Set(q.queue)]
  const errorsFor = (id: string) => q.results.filter((r) => r.id === id).reduce((n, r) => n + r.errors + (r.outcome === 'failed' ? 1 : 0), 0)
  const missed = unique.filter((id) => {
    const rs = q.results.filter((r) => r.id === id)
    return rs.length === 0 || rs.some((r) => r.outcome !== 'perfect')
  })
  const firstTry = new Map<string, boolean>()
  for (const r of q.results) if (!firstTry.has(r.id)) firstTry.set(r.id, r.outcome === 'perfect')
  const score = isAssessment ? unique.length - missed.length : [...firstTry.values()].filter(Boolean).length
  const total = isAssessment ? unique.length : firstTry.size
  const xp = useCountUp(q.sessionXp)
  const shownScore = useCountUp(score, 600)

  const review = () =>
    startSession({ kind: 'review', moduleId: config.moduleId, mode: 'learn', region: null, ids: missed, length: missed.length, answerTimer: 0 })

  return (
    <div className="quiz summary">
      <div className="summary-inner">
        <p className="kicker">{isAssessment ? t('summary.exam') : t('summary.session')}</p>
        <h1 className="summary-score serif">
          {shownScore}
          <span className="muted">/{total}</span>
        </h1>
        <p className="muted">{isAssessment ? t('summary.noErrors') : t('summary.firstTry')}</p>
        {total > 0 && score === total && <span className="stamp summary-stamp">{t('quiz.correct')}</span>}

        <div className="figures summary-figures">
          <div className="figure">
            <span className="figure-num serif xp-num">+{xp}</span>
            <span className="kicker">{t('summary.xp')}</span>
          </div>
          <div className="figure">
            <span className="figure-num serif">{accuracyOf(q.keysCorrect, q.keysWrong)}%</span>
            <span className="kicker">{t('summary.accuracy')}</span>
          </div>
          <div className="figure">
            <span className="figure-num serif">{q.bestStreak}</span>
            <span className="kicker">{t('summary.bestCombo')}</span>
          </div>
          <div className="figure">
            <span className="figure-num serif">{formatClock(q.finishedAt - q.startedAt)}</span>
            <span className="kicker">{t('summary.time')}</span>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="section">
            <div className="section-head">
              <h2 className="h2">{t('summary.review')}</h2>
              <span className="kicker">{missed.length}</span>
            </div>
            <div className="index">
              {missed.map((id) => (
                <div className="index-row static" key={id}>
                  <span className="index-main index-title">{q.byId[id]?.name}</span>
                  <span className="mono tiny muted">{q.results.some((r) => r.id === id) ? t('summary.errors', { n: errorsFor(id) }) : t('summary.unanswered')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-actions">
          {missed.length > 0 && (
            <button className="btn btn-accent btn-block" onClick={review}>
              {t('summary.fix')}
            </button>
          )}
          <button className="btn btn-ink btn-block" onClick={endSession}>
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
