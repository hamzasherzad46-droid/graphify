import { useModule } from '../content/useModule'
import { pct } from '../lib/format'
import { isMastered } from '../lib/srs'
import { defaultModuleId, startReview } from '../state/actions'
import { useProgress } from '../state/progress'
import { missedCount, mostMissed, regionStats } from '../state/stats'

export function ProgressScreen() {
  const { assets } = useModule(defaultModuleId)
  const records = useProgress((s) => s.records)
  if (!assets) return <main className="screen" />

  const { content } = assets
  const regions = regionStats(content, records)
  const seen = regions.reduce((n, r) => n + r.seen, 0)
  const mastered = regions.reduce((n, r) => n + r.mastered, 0)
  const attempts = regions.reduce((n, r) => n + r.attempts, 0)
  const correct = regions.reduce((n, r) => n + r.correct, 0)
  const missed = mostMissed(content, records)
  const toReview = missedCount(content, records)

  return (
    <main className="screen">
      <h1 className="screen-title">Progress</h1>
      <p className="screen-sub">Skeleton module</p>

      <div className="stat-grid">
        <div className="stat">
          <b>{seen}</b>
          <span>Seen of {content.structures.length}</span>
        </div>
        <div className="stat">
          <b>{mastered}</b>
          <span>Mastered</span>
        </div>
        <div className="stat">
          <b>{attempts ? `${pct(correct, attempts)}%` : '—'}</b>
          <span>Accuracy</span>
        </div>
      </div>

      <button className="btn btn-accent btn-block progress-review" disabled={!toReview} onClick={() => void startReview(defaultModuleId)}>
        Review mistakes{toReview ? ` (${toReview})` : ''}
      </button>

      <p className="section-label">By region</p>
      <div className="list">
        {regions.map((r) => (
          <div key={r.id} className="card">
            <div className="row">
              <span>{r.name}</span>
              <span className="muted small">{r.accuracy === null ? 'not started' : `${r.accuracy}%`}</span>
            </div>
            <div className="bar progress-bar">
              <span style={{ width: `${r.accuracy ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="section-label">Most missed</p>
      {missed.length === 0 ? (
        <p className="empty">No misses yet.</p>
      ) : (
        <div className="list">
          {missed.map(({ structure, record, misses }) => (
            <div key={structure.id} className="card row">
              <span className="serif structure-name">{structure.name}</span>
              <span className="muted small">
                {misses}× missed · {pct(record.correct, record.attempts)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="section-label">Every structure</p>
      <div className="structure-table">
        {content.structures.map((s) => {
          const r = records[s.id]
          return (
            <div key={s.id} className="row structure-row">
              <span className={isMastered(r) ? 'mastered' : ''}>{s.name}</span>
              <span className="muted small">{r ? `${pct(r.correct, r.attempts)}% · ${r.attempts}×` : '—'}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}
