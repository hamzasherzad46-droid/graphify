import { useState } from 'react'
import { COURSES, usePrefs, type Theme } from '../state/store'
import { useProgress } from '../state/progress'
import { Credits } from './Credits'
import { Disclaimer } from './Disclaimer'

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="row">
      <span>{label}</span>
      <div className="segmented small" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={String(v)} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

/** You: profile, study goal, appearance, sounds and haptics, reviewer tools, data, about. */
export function YouScreen() {
  const p = usePrefs()
  const reset = useProgress((s) => s.reset)
  const [page, setPage] = useState<'you' | 'credits' | 'disclaimer'>('you')
  const [confirm, setConfirm] = useState(false)
  const reviews = Object.keys(p.reviewOverrides).length
  return (
    <div className="tab-page you">
      <header className="page-head">
        <h1>You</h1>
      </header>
      <div className="page-body">
        <section>
          <h3 className="sheet-sub">Profile</h3>
          <label className="field">
            <span>Name</span>
            <input value={p.name} maxLength={40} autoComplete="given-name" placeholder="Your first name" onChange={(e) => p.setProfile({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Course</span>
            <select value={p.course} onChange={(e) => p.setProfile({ course: e.target.value as typeof p.course })}>
              <option value="">Choose your course</option>
              {COURSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Seg label="Daily goal (answers)" value={p.dailyGoal} options={[[10, '10'], [20, '20'], [30, '30'], [50, '50']]} onChange={(dailyGoal) => p.setProfile({ dailyGoal })} />
        </section>

        <section>
          <h3 className="sheet-sub">App</h3>
          <Seg label="Appearance" value={p.theme} options={([['dark', 'Dark'], ['light', 'Light'], ['system', 'Match device']] as [Theme, string][])} onChange={(t) => p.setTheme(t)} />
          <Seg label="Labels in 3D" value={p.labelDensity} options={[['all', 'All'], ['main', 'Main bones'], ['none', 'None']]} onChange={(d) => p.setLabelDensity(d)} />
          <label className="row">
            <span>Sounds</span>
            <input type="checkbox" className="switch" checked={p.study.sound} onChange={(e) => p.setStudy({ sound: e.target.checked })} />
          </label>
          <label className="row">
            <span>Haptics</span>
            <input type="checkbox" className="switch" checked={p.haptics} onChange={(e) => p.setProfile({ haptics: e.target.checked })} />
          </label>
        </section>

        <section>
          <h3 className="sheet-sub">For academic reviewers</h3>
          <label className="row">
            <span>Reviewer mode</span>
            <input type="checkbox" className="switch" checked={p.reviewerMode} onChange={(e) => p.setReviewerMode(e.target.checked)} />
          </label>
          {p.reviewerMode && (
            <>
              <label className="field">
                <span>Reviewer name</span>
                <input value={p.reviewerName} onChange={(e) => p.setReviewerName(e.target.value)} placeholder="Shown on reviewed bones" />
              </label>
              <button className="row link" disabled={!reviews} onClick={() => download('atlas-reviews.json', p.reviewOverrides)}>
                Export review changes ({reviews}) <span aria-hidden>↓</span>
              </button>
            </>
          )}
          <button className="row link" disabled={!p.reports.length} onClick={() => download('atlas-error-reports.json', p.reports)}>
            Export error reports ({p.reports.length}) <span aria-hidden>↓</span>
          </button>
        </section>

        <section>
          <h3 className="sheet-sub">Data</h3>
          <p className="muted small">Your progress is saved on this device only. Cloud sync comes later.</p>
          {confirm ? (
            <div className="confirm">
              <span>Erase all progress and flashcard schedules?</span>
              <button className="btn ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  reset()
                  setConfirm(false)
                }}
              >
                Erase
              </button>
            </div>
          ) : (
            <button className="row link" onClick={() => setConfirm(true)}>
              Reset progress <span aria-hidden>›</span>
            </button>
          )}
        </section>

        <section>
          <h3 className="sheet-sub">About</h3>
          <button className="row link" onClick={() => setPage('credits')}>
            Credits and attribution <span aria-hidden>›</span>
          </button>
          <button className="row link" onClick={() => setPage('disclaimer')}>
            Educational use disclaimer <span aria-hidden>›</span>
          </button>
          <p className="muted small version">Atlas · skeletal system · content in academic review</p>
        </section>
      </div>
      {page === 'credits' && <Credits onBack={() => setPage('you')} />}
      {page === 'disclaimer' && <Disclaimer onClose={() => setPage('you')} />}
    </div>
  )
}
