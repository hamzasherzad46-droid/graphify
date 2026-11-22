import { usePrefs, type StudySettings } from '../../state/store'
import { useProgress } from '../../state/progress'
import { AREAS } from '../../learn/pool'
import { deckFor } from '../../learn/deck'
import { weakest } from '../../learn/weak'
import { MODE_INFO, useSession, type Mode } from '../../learn/session'
import { CloseIcon } from '../Icons'

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

/** Choose a study mode and its settings. */
export function StudyLauncher() {
  const s = usePrefs((p) => p.study)
  const set = (x: Partial<StudySettings>) => usePrefs.getState().setStudy(x)
  const stats = useProgress((p) => p.stats)
  const cards = useProgress((p) => p.cards)
  const { open, setLauncher } = useSession()
  const weakCount = weakest(stats, 999).length
  const now = new Date().toISOString()
  const due = deckFor(s.area).filter((c) => cards[c.id] && cards[c.id].due <= now).length
  const note: Record<Mode, string> = {
    typing: s.timeLimit ? `${s.count || 'All'} bones · ${s.timeLimit / 60} min` : `${s.count || 'All'} bones · untimed`,
    flashcards: `${due} due · up to ${s.newPerDay} new today`,
    quiz: `${s.count || 'All'} questions · ${s.perQuestion ? `${s.perQuestion} s each` : 'untimed'}`,
    weak: weakCount ? `${weakCount} bones to work on` : 'Nothing yet: missed bones appear here',
  }
  return (
    <div className="modal-backdrop" onClick={() => setLauncher(false)}>
      <aside className="sheet study-sheet" role="dialog" aria-modal aria-label="Study" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Study</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => setLauncher(false)}>
            <CloseIcon />
          </button>
        </header>
        <div className="modes">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button key={m} className="mode" disabled={m === 'weak' && !weakCount} onClick={() => open(m)}>
              <span className="mode-title">{MODE_INFO[m].title}</span>
              <span className="mode-blurb">{MODE_INFO[m].blurb}</span>
              <span className="mode-note">{note[m]}</span>
            </button>
          ))}
        </div>
        <h3 className="sheet-sub">Settings</h3>
        <div className="row area-row">
          <span>Region</span>
        </div>
        <div className="explode-groups area-chips" role="radiogroup" aria-label="Region">
          {AREAS.map((a) => (
            <button key={a.id} role="radio" aria-checked={s.area === a.id} className={`chip ${s.area === a.id ? 'on' : ''}`} onClick={() => set({ area: a.id })}>
              {a.label}
            </button>
          ))}
        </div>
        <Seg label="Skeleton" value={s.sex} options={[['male', 'Male'], ['female', 'Female']]} onChange={(sex) => set({ sex })} />
        <Seg label="Bones per session" value={s.count} options={[[10, '10'], [20, '20'], [50, '50'], [0, 'All']]} onChange={(count) => set({ count })} />
        <Seg label="Typing time limit" value={s.timeLimit} options={[[0, 'None'], [60, '1 min'], [180, '3 min'], [300, '5 min']]} onChange={(timeLimit) => set({ timeLimit })} />
        <Seg label="Quiz time per question" value={s.perQuestion} options={[[0, 'None'], [10, '10 s'], [20, '20 s'], [30, '30 s']]} onChange={(perQuestion) => set({ perQuestion })} />
        <Seg label="New flashcards a day" value={s.newPerDay} options={[[10, '10'], [15, '15'], [25, '25']]} onChange={(newPerDay) => set({ newPerDay })} />
        <label className="row">
          <span>Keyboard and answer sounds</span>
          <input type="checkbox" className="switch" checked={s.sound} onChange={(e) => set({ sound: e.target.checked })} />
        </label>
      </aside>
    </div>
  )
}
