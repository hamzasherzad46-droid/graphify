import { getModuleInfo } from '../content/loader'
import { formatClock, pct } from '../lib/format'
import { ASSESSMENT_LENGTH, ASSESSMENT_TIME_MS } from '../state/nav'
import { defaultModuleId, startAssessment } from '../state/actions'
import { useProgress } from '../state/progress'

export function AssessScreen() {
  const results = useProgress((s) => s.assessments)
  const info = getModuleInfo(defaultModuleId)

  return (
    <main className="screen">
      <h1 className="screen-title">Assessments</h1>
      <p className="screen-sub">A timed test in hard mode. No ghost letters, no definitions.</p>

      <div className="card assess-card">
        <p className="serif module-title">{info?.title} test</p>
        <p className="muted small">
          {ASSESSMENT_LENGTH} questions · {ASSESSMENT_TIME_MS / 60_000} minutes · hard mode
        </p>
        <button className="btn btn-accent btn-block assess-start" onClick={() => startAssessment(defaultModuleId)}>
          Start test
        </button>
      </div>

      <p className="section-label">History</p>
      {results.length === 0 ? (
        <p className="empty">No tests taken yet.</p>
      ) : (
        <div className="list">
          {results.map((r) => (
            <div key={r.at} className="card row">
              <span>
                <span className="serif assess-score">
                  {r.correct}/{r.total}
                </span>{' '}
                <span className="muted small">{pct(r.correct, r.total)}%</span>
              </span>
              <span className="muted small">
                {new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {formatClock(r.durationMs)}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
