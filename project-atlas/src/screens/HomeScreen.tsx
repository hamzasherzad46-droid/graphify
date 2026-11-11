import { getModuleInfo } from '../content/loader'
import { useModule } from '../content/useModule'
import { pct } from '../lib/format'
import { defaultModuleId, startPractice, startReview } from '../state/actions'
import { useNav } from '../state/nav'
import { dayKey, useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { missedCount, regionStats, weakRegions } from '../state/stats'
import { ChevronIcon } from '../components/Icons'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function HomeScreen() {
  const last = useSettings((s) => s.lastSession)
  const { records, days } = useProgress()
  const setTab = useNav((s) => s.setTab)
  const moduleId = last?.moduleId ?? defaultModuleId
  const { assets } = useModule(moduleId)
  const today = days[dayKey()] ?? { answered: 0, correct: 0, ms: 0 }
  const stats = assets ? regionStats(assets.content, records) : []
  const weak = weakRegions(stats)
  const missed = assets ? missedCount(assets.content, records) : 0
  const regionName = (id: string | null) => (id ? (assets?.content.regions.find((r) => r.id === id)?.name ?? id) : 'All regions')

  return (
    <main className="screen">
      <h1 className="screen-title">{greeting()}</h1>
      <p className="screen-sub">Type what you see. One structure at a time.</p>

      <p className="section-label">Today</p>
      <div className="stat-grid">
        <div className="stat">
          <b>{today.answered}</b>
          <span>Answered</span>
        </div>
        <div className="stat">
          <b>{today.answered ? `${pct(today.correct, today.answered)}%` : '—'}</b>
          <span>First-try</span>
        </div>
        <div className="stat">
          <b>{Math.round(today.ms / 60_000)}</b>
          <span>Minutes</span>
        </div>
      </div>

      <p className="section-label">{last ? 'Continue' : 'Start here'}</p>
      <button
        className="card row continue"
        onClick={() => startPractice(moduleId, last?.region ?? null, last?.mode ?? 'learn')}
      >
        <span>
          <span className="serif continue-title">{getModuleInfo(moduleId)?.title}</span>
          <span className="muted small continue-sub">
            {regionName(last?.region ?? null)} · {last?.mode === 'hard' ? 'Hard mode' : 'Learn mode'}
          </span>
        </span>
        <span className="continue-go">
          <ChevronIcon />
        </span>
      </button>

      {missed > 0 && (
        <button className="card row review-row" onClick={() => void startReview(moduleId)}>
          <span>Review mistakes</span>
          <span className="muted small">{missed} to review</span>
        </button>
      )}

      <p className="section-label">Weak areas</p>
      {weak.length === 0 ? (
        <p className="empty">Nothing yet. Weak regions show up here after a few sessions.</p>
      ) : (
        <div className="list">
          {weak.slice(0, 3).map((r) => (
            <button key={r.id} className="card row" onClick={() => startPractice(moduleId, r.id, 'learn')}>
              <span>{r.name}</span>
              <span className="muted small">{r.accuracy}% accuracy</span>
            </button>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-block home-explore" onClick={() => setTab('explore')}>
        Explore the 3D model
      </button>
    </main>
  )
}
