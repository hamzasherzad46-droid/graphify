import { useState } from 'react'
import { COURSES, usePrefs, type Theme } from '../state/store'
import { today, useProgress } from '../state/progress'
import { streak } from '../learn/mastery'
import { Choice, Field, Group, LinkRow, Toggle } from './Settings'
import { UserIcon } from './Icons'
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
        <ProfileCard />

        <Group title="Profile">
          <Field label="Name">
            <input value={p.name} maxLength={40} autoComplete="given-name" placeholder="Your first name" onChange={(e) => p.setProfile({ name: e.target.value })} />
          </Field>
          <Field label="Course">
            <select value={p.course} onChange={(e) => p.setProfile({ course: e.target.value as typeof p.course })}>
              <option value="">Choose your course</option>
              {COURSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Choice
            label="Daily goal"
            hint="Answers and reviews a day"
            value={p.dailyGoal}
            options={[
              [10, '10'],
              [20, '20'],
              [30, '30'],
              [50, '50'],
            ]}
            onChange={(dailyGoal) => p.setProfile({ dailyGoal })}
          />
        </Group>

        <Group title="Appearance">
          <Choice
            label="Theme"
            value={p.theme}
            options={
              [
                ['dark', 'Dark'],
                ['light', 'Light'],
                ['system', 'Device'],
              ] as [Theme, string][]
            }
            onChange={(t) => p.setTheme(t)}
          />
          <Choice
            label="Labels in 3D"
            hint="Names shown on the model"
            value={p.labelDensity}
            options={[
              ['all', 'All'],
              ['main', 'Main bones'],
              ['none', 'None'],
            ]}
            onChange={(d) => p.setLabelDensity(d)}
          />
        </Group>

        <Group title="Sound and touch">
          <Toggle label="Sounds" hint="Keyboard clicks and answer sounds" checked={p.study.sound} onChange={(sound) => p.setStudy({ sound })} />
          <Toggle label="Haptics" hint="Small vibrations on answers and taps" checked={p.haptics} onChange={(haptics) => p.setProfile({ haptics })} />
        </Group>

        <Group title="For academic reviewers">
          <Toggle label="Reviewer mode" hint="Edit and sign off bone content" checked={p.reviewerMode} onChange={(on) => p.setReviewerMode(on)} />
          {p.reviewerMode && (
            <>
              <Field label="Reviewer name">
                <input value={p.reviewerName} onChange={(e) => p.setReviewerName(e.target.value)} placeholder="Shown on reviewed bones" />
              </Field>
              <LinkRow label="Export review changes" value={reviews} disabled={!reviews} onClick={() => download('atlas-reviews.json', p.reviewOverrides)} end={<DownloadMark />} />
            </>
          )}
          <LinkRow label="Export error reports" value={p.reports.length} disabled={!p.reports.length} onClick={() => download('atlas-error-reports.json', p.reports)} end={<DownloadMark />} />
        </Group>

        <Group title="Your data" note="Your progress is saved on this device only.">
          {confirm ? (
            <div className="pref-row stack confirm-row" role="alert">
              <span className="pref-label">
                <span className="pref-name">Erase all progress?</span>
                <span className="pref-hint">Answers, streaks and flashcard schedules on this device. This cannot be undone.</span>
              </span>
              <div className="confirm-actions">
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
            </div>
          ) : (
            <LinkRow label="Reset progress" danger onClick={() => setConfirm(true)} />
          )}
        </Group>

        <Group title="About">
          <LinkRow label="Credits and attribution" onClick={() => setPage('credits')} />
          <LinkRow label="Educational use disclaimer" onClick={() => setPage('disclaimer')} />
        </Group>
        <p className="muted small version">Atlas · Skeletal system · Content in academic review</p>
      </div>
      {page === 'credits' && <Credits onBack={() => setPage('you')} />}
      {page === 'disclaimer' && <Disclaimer onClose={() => setPage('you')} />}
    </div>
  )
}

const DownloadMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
  </svg>
)

/** Who is studying, with today's progress and the streak. */
function ProfileCard() {
  const name = usePrefs((s) => s.name.trim())
  const course = usePrefs((s) => s.course)
  const goal = usePrefs((s) => s.dailyGoal)
  const days = useProgress((s) => s.days)
  const done = useProgress((s) => s.daily[today()] ?? 0)
  const run = streak(days, today()).current
  return (
    <div className="profile-card">
      <div className="profile-top">
        <span className="avatar" aria-hidden>
          {name ? name[0].toUpperCase() : <UserIcon />}
        </span>
        <span className="profile-who">
          <strong>{name || 'Welcome'}</strong>
          <span>{course || 'Add your name and course below'}</span>
        </span>
      </div>
      <div className="profile-stats">
        <div>
          <span className="num">{run}</span>
          <span className="k">Day streak</span>
        </div>
        <div>
          <span className="num">
            {Math.min(done, goal)}
            <small>/{goal}</small>
          </span>
          <span className="k">Today’s goal</span>
        </div>
        <div className="goal-ring" aria-label={`${Math.round(Math.min(1, done / goal) * 100)}% of today’s goal`}>
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" className="track" />
            {done > 0 && <circle cx="18" cy="18" r="15.5" className="fill" style={{ strokeDasharray: `${Math.min(1, done / goal) * 97.4} 97.4` }} />}
          </svg>
        </div>
      </div>
    </div>
  )
}
