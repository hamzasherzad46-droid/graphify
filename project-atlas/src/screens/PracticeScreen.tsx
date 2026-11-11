import { useState } from 'react'
import { useModule } from '../content/useModule'
import { defaultModuleId, startPractice, startReview } from '../state/actions'
import { useProgress } from '../state/progress'
import { useSettings, type QuizMode } from '../state/settings'
import { missedCount } from '../state/stats'

export function PracticeScreen() {
  const last = useSettings((s) => s.lastSession)
  const [mode, setMode] = useState<QuizMode>(last?.mode ?? 'learn')
  const [region, setRegion] = useState<string | null>(last?.region ?? null)
  const moduleId = defaultModuleId
  const { assets } = useModule(moduleId)
  const records = useProgress((s) => s.records)
  const missed = assets ? missedCount(assets.content, records) : 0

  return (
    <main className="screen">
      <h1 className="screen-title">Practice</h1>
      <p className="screen-sub">Spaced repetition picks what you need most.</p>

      <p className="section-label">Mode</p>
      <div className="segmented">
        <button aria-pressed={mode === 'learn'} onClick={() => setMode('learn')}>
          Learn
        </button>
        <button aria-pressed={mode === 'hard'} onClick={() => setMode('hard')}>
          Hard
        </button>
      </div>
      <p className="muted small mode-help">
        {mode === 'learn' ? 'The answer shows as faint letters, with a definition as a clue.' : 'Only dashes, one per letter. No clues.'}
      </p>

      <p className="section-label">Region</p>
      <div className="chips">
        <button className="chip" aria-pressed={region === null} onClick={() => setRegion(null)}>
          All
        </button>
        {assets?.content.regions.map((r) => (
          <button key={r.id} className="chip" aria-pressed={region === r.id} onClick={() => setRegion(r.id)}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="practice-actions">
        <button className="btn btn-primary btn-block" disabled={!assets} onClick={() => startPractice(moduleId, region, mode)}>
          Start
        </button>
        <button className="btn btn-ghost btn-block" disabled={!missed} onClick={() => void startReview(moduleId)}>
          Review mistakes{missed ? ` (${missed})` : ''}
        </button>
      </div>
    </main>
  )
}
