import { useNav } from '../state/nav'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { ChevronIcon } from '../components/Icons'

export function ProfileScreen() {
  const s = useSettings()
  const reset = useProgress((p) => p.reset)
  const setCredits = useNav((n) => n.setCredits)

  return (
    <main className="screen">
      <h1 className="screen-title">Profile</h1>
      <p className="screen-sub">Settings are stored on this device.</p>

      <p className="section-label">Appearance</p>
      <div className="segmented">
        {(['dark', 'light', 'system'] as const).map((t) => (
          <button key={t} aria-pressed={s.theme === t} onClick={() => s.setTheme(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <p className="section-label">Study track</p>
      <div className="segmented">
        <button aria-pressed={s.track === 'nursing'} onClick={() => s.setTrack('nursing')}>
          Nursing
        </button>
        <button aria-pressed={s.track === 'medicine'} onClick={() => s.setTrack('medicine')}>
          Medicine
        </button>
      </div>
      <p className="muted small mode-help">
        {s.track === 'nursing'
          ? 'Adds clinical notes such as injection, pulse and cannulation sites.'
          : 'Adds Latin names (accepted as answers) and finer landmarks.'}
      </p>

      <p className="section-label">Sound</p>
      <button className="card row" role="switch" aria-checked={s.sound} onClick={() => s.setSound(!s.sound)}>
        <span>Key sounds</span>
        <span className={`switch${s.sound ? ' on' : ''}`} />
      </button>

      <p className="section-label">Data</p>
      <div className="list">
        <button
          className="card row danger-row"
          onClick={() => {
            if (window.confirm('Reset all progress? This cannot be undone.')) reset()
          }}
        >
          <span>Reset progress</span>
        </button>
        <button className="card row" onClick={() => setCredits(true)}>
          <span>About & credits</span>
          <ChevronIcon />
        </button>
      </div>
    </main>
  )
}
