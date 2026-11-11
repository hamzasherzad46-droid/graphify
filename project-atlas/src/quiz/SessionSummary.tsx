import { useNav } from '../state/nav'
import { accuracyOf, useQuiz } from '../state/quiz'
import { formatClock } from '../lib/format'

export function SessionSummary() {
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
  const elapsed = q.finishedAt - q.startedAt

  const review = () =>
    startSession({ kind: 'review', moduleId: config.moduleId, mode: 'learn', region: null, ids: missed, length: missed.length })

  return (
    <div className="quiz summary">
      <div className="summary-inner">
        <p className="section-label">{isAssessment ? 'Assessment complete' : 'Session complete'}</p>
        <h1 className="summary-score serif">
          {score}
          <span className="muted">/{total}</span>
        </h1>
        <p className="muted">{isAssessment ? 'answered without errors' : 'correct on the first try'}</p>

        <div className="stat-grid summary-stats">
          <div className="stat">
            <b>{accuracyOf(q.keysCorrect, q.keysWrong)}%</b>
            <span>Accuracy</span>
          </div>
          <div className="stat">
            <b>{q.bestStreak}</b>
            <span>Best streak</span>
          </div>
          <div className="stat">
            <b>{formatClock(elapsed)}</b>
            <span>Time</span>
          </div>
        </div>

        {missed.length > 0 && (
          <>
            <p className="section-label">To review</p>
            <div className="list">
              {missed.map((id) => (
                <div className="card row" key={id}>
                  <span className="serif summary-name">{q.byId[id]?.name}</span>
                  <span className="muted small">{q.results.some((r) => r.id === id) ? `${errorsFor(id)} ${errorsFor(id) === 1 ? 'error' : 'errors'}` : 'unanswered'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="summary-actions">
          {missed.length > 0 && (
            <button className="btn btn-accent btn-block" onClick={review}>
              Review mistakes
            </button>
          )}
          <button className="btn btn-ghost btn-block" onClick={endSession}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
