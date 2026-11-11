import { catalog } from '../content/loader'
import type { ModuleInfo } from '../content/types'
import { useModule } from '../content/useModule'
import { pct } from '../lib/format'
import { startPractice } from '../state/actions'
import { useProgress } from '../state/progress'
import { regionStats } from '../state/stats'

export function CoursesScreen() {
  return (
    <main className="screen">
      <h1 className="screen-title">Courses</h1>
      <p className="screen-sub">Modules unlock as content is added.</p>
      {catalog.courses.map((course) => (
        <section key={course.id}>
          <p className="section-label">{course.title}</p>
          <div className="list">
            {course.modules.map((m) => (m.status === 'available' ? <ModuleCard key={m.id} info={m} /> : <LockedModule key={m.id} info={m} />))}
          </div>
        </section>
      ))}
    </main>
  )
}

function LockedModule({ info }: { info: ModuleInfo }) {
  return (
    <div className="card module locked" aria-disabled>
      <div className="row">
        <span className="serif module-title">{info.title}</span>
        <span className="pill">Coming soon</span>
      </div>
      <p className="muted small">{info.description}</p>
    </div>
  )
}

function ModuleCard({ info }: { info: ModuleInfo }) {
  const { assets } = useModule(info.id)
  const records = useProgress((s) => s.records)
  const stats = assets ? regionStats(assets.content, records) : []
  const total = stats.reduce((n, r) => n + r.total, 0)
  const mastered = stats.reduce((n, r) => n + r.mastered, 0)

  return (
    <div className="card module">
      <div className="row">
        <span className="serif module-title">{info.title}</span>
        <span className="muted small">
          {mastered}/{total} mastered
        </span>
      </div>
      <p className="muted small">{info.description}</p>
      <div className="bar module-bar">
        <span style={{ width: `${pct(mastered, total)}%` }} />
      </div>
      <div className="list module-regions">
        {stats.map((r) => (
          <button key={r.id} className="row region-row" onClick={() => startPractice(info.id, r.id, 'learn')}>
            <span>{r.name}</span>
            <span className="muted small">
              {r.seen}/{r.total} seen · Practice →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
