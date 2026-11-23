import { useMemo, useState } from 'react'
import { useProgress, today } from '../state/progress'
import { useSession } from '../learn/session'
import { summarize, regionMastery, streak, heatmap, level, byName, isMastered } from '../learn/mastery'
import { weakest } from '../learn/weak'
import { BONE_BY_ID } from '../data/bones'
import { withSide } from '../learn/pool'

const WEEKS = 15
const DOW = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const pct = (x: number) => `${Math.round(x * 100)}%`
const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })

/** Progress: mastery, accuracy, streak, study days and weakest bones. Everything is computed from local data. */
export function ProgressScreen() {
  const stats = useProgress((s) => s.stats)
  const days = useProgress((s) => s.days)
  const daily = useProgress((s) => s.daily)
  const reset = useProgress((s) => s.reset)
  const [day, setDay] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const d = today()
  const sum = useMemo(() => summarize(stats), [stats])
  const regions = useMemo(() => regionMastery(stats), [stats])
  const st = useMemo(() => streak(days, d), [days, d])
  const grid = useMemo(() => heatmap(daily, d, WEEKS), [daily, d])
  const weak = useMemo(() => weakest(stats, 8), [stats])
  const names = useMemo(() => [...byName(stats).values()].filter((n) => n.seen > 0).sort((a, b) => a.correct / a.seen - b.correct / b.seen || b.seen - a.seen), [stats])
  const months = grid.map((w, i) => {
    const first = w.find((c) => c && c.date.endsWith('-01')) ?? (i === 0 ? w[0] : null)
    return first ? new Date(`${first.date}T12:00:00`).toLocaleDateString([], { month: 'short' }) : ''
  })
  const startWeak = () => {
    useSession.getState().open('weak')
  }

  return (
    <div className="tab-page progress-page">
      <header className="page-head">
        <h1>Progress</h1>
      </header>
      <div className="page-body">
        <section className="kpis" aria-label="Summary">
          <div className="kpi">
            <span className="k">Bones mastered</span>
            <span className="v">
              {sum.bonesMastered}
              <span className="of"> / 206</span>
            </span>
          </div>
          <div className="kpi">
            <span className="k">Accuracy</span>
            <span className="v">{sum.accuracy === null ? '—' : pct(sum.accuracy)}</span>
            <span className="sub">{sum.answers} answers</span>
          </div>
          <div className="kpi">
            <span className="k">Bones seen</span>
            <span className="v">
              {sum.bonesSeen}
              <span className="of"> / 206</span>
            </span>
          </div>
          <div className="kpi">
            <span className="k">Days in a row</span>
            <span className="v">{st.current}</span>
            <span className="sub">Longest {st.longest}</span>
          </div>
        </section>
        <p className="muted small rule">Mastered: answered at least 3 times, the last 3 right, and 80 % right overall. Left and right count together.</p>

        <section aria-labelledby="by-region">
          <h3 id="by-region">Mastery by region</h3>
          <ul className="meters">
            {regions.map((r) => (
              <li key={r.label}>
                <span className="m-name">{r.label}</span>
                <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.mastered} aria-label={`${r.label}: ${r.mastered} of ${r.total} mastered`}>
                  <span className="seen" style={{ width: `${(r.seen / r.total) * 100}%` }} />
                  <span className="fill" style={{ width: `${(r.mastered / r.total) * 100}%` }} />
                </span>
                <span className="m-val">
                  {r.mastered}/{r.total}
                </span>
              </li>
            ))}
          </ul>
          <p className="legend small">
            <span className="sw fill" /> Mastered <span className="sw seen" /> Seen
          </p>
        </section>

        <section aria-labelledby="study-days">
          <h3 id="study-days">Study days</h3>
          <div className="heat" role="grid" aria-label={`Answers per day, last ${WEEKS} weeks`}>
            <div className="heat-months" aria-hidden>
              <span />
              {months.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
            <div className="heat-grid">
              <div className="heat-dow" aria-hidden>
                {DOW.map((x, i) => (
                  <span key={i}>{x}</span>
                ))}
              </div>
              {grid.map((w, wi) => (
                <div key={wi} className="heat-col" role="row">
                  {w.map((c, di) =>
                    c ? (
                      <button
                        key={di}
                        role="gridcell"
                        className={`cell l${level(c.count)} ${day === c.date ? 'sel' : ''} ${c.date === d ? 'today' : ''}`}
                        aria-label={`${longDate(c.date)}: ${c.count} answers`}
                        title={`${longDate(c.date)}: ${c.count} answers`}
                        onClick={() => setDay(day === c.date ? null : c.date)}
                      />
                    ) : (
                      <span key={di} className="cell future" aria-hidden />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="heat-foot small">
            <span className="muted" role="status">
              {day ? `${longDate(day)} · ${daily[day] ?? 0} answers` : 'Tap a day to see it.'}
            </span>
            <span className="heat-legend" aria-hidden>
              Less
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`cell l${l}`} />
              ))}
              More
            </span>
          </div>
        </section>

        <section aria-labelledby="weakest">
          <h3 id="weakest">Weakest bones</h3>
          {weak.length ? (
            <>
              <ul className="weak-list">
                {weak.map((id) => {
                  const b = BONE_BY_ID.get(id)!
                  const s = stats[id]
                  return (
                    <li key={id}>
                      <span>{withSide(b)}</span>
                      <span className="muted small">
                        {s.correct} of {s.seen} right
                      </span>
                    </li>
                  )
                })}
              </ul>
              <button className="btn primary wide" onClick={startWeak}>
                Practise weak bones
              </button>
            </>
          ) : (
            <p className="muted">No weak bones yet. Bones you get wrong appear here.</p>
          )}
        </section>

        {names.length > 0 && (
          <section>
            <details className="per-bone">
              <summary>
                <h3>Accuracy per bone ({names.length})</h3>
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Bone</th>
                    <th>Right</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {names.map((n) => (
                    <tr key={n.key}>
                      <td>
                        {n.name}
                        {isMastered(n) && <span className="mastered-tag">Mastered</span>}
                      </td>
                      <td className="num">
                        {n.correct}/{n.seen}
                      </td>
                      <td className="num">{pct(n.correct / n.seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        )}

        <footer className="screen-foot">
          <p className="muted small">Saved on this device. Cloud sync comes later.</p>
          {confirmReset ? (
            <div className="confirm">
              <span>Erase all progress and flashcard schedules?</span>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                }}
              >
                Erase
              </button>
            </div>
          ) : (
            <button className="link-btn muted-link" onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
