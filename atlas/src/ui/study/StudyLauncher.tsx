import { usePrefs, type StudySettings } from '../../state/store'
import { useProgress } from '../../state/progress'
import { AREAS } from '../../learn/pool'
import { deckFor } from '../../learn/deck'
import { weakest } from '../../learn/weak'
import { LAYERED } from '../../learn/layered'
import { MODE_INFO, useSession, type Mode } from '../../learn/session'
import { SETS, setById } from '../../learn/spelling'
import { liveCards, useMyCards } from '../../learn/mycards'
import { useState, type ReactNode } from 'react'
import { BackIcon, BookIcon, CalendarIcon, CardsIcon, ChevronRightIcon, PracticeIcon, QuestionIcon, SpellIcon } from '../Icons'
import { Choice, Chips, Group, Toggle } from '../Settings'

const ICON: Record<Mode, ReactNode> = {
  typing: <SpellIcon />,
  flashcards: <CalendarIcon />,
  quiz: <QuestionIcon />,
  weak: <PracticeIcon />,
  mycards: <BookIcon />,
  layered: <CardsIcon />,
}

/** Practice tab: choose a study mode and its settings. */
export function StudyLauncher() {
  const s = usePrefs((p) => p.study)
  const stats = useProgress((p) => p.stats)
  const cards = useProgress((p) => p.cards)
  const { open } = useSession()
  const weakCount = weakest(stats, 999).length
  const myCards = liveCards(useMyCards((p) => p.cards)).length
  const now = new Date().toISOString()
  const due = deckFor(s.area).filter((c) => cards[c.id] && cards[c.id].due <= now).length
  const note: Record<Mode, string> = {
    typing: `${SETS.length} focused sets · last: ${(setById(s.spellSet ?? '') ?? SETS[0]).title}`,
    flashcards: `${due} due · up to ${s.newPerDay} new today`,
    quiz: `${s.count || 'All'} questions · ${s.perQuestion ? `${s.perQuestion} s each` : 'untimed'}`,
    weak: weakCount ? `${weakCount} bones to work on` : 'Nothing yet: missed bones appear here',
    mycards: myCards ? `${myCards} ${myCards === 1 ? 'card' : 'cards'}` : 'Make one from a highlight or note (Lessons)',
    layered: `Preview: ${LAYERED.length} draft cards: Skull, Upper limb, muscles and organs`,
  }
  const [page, setPage] = useState<'modes' | 'settings'>('modes')
  if (page === 'settings') return <PracticeSettings onBack={() => setPage('modes')} />
  const area = AREAS.find((a) => a.id === s.area)?.label ?? 'Whole skeleton'
  return (
    <div className="tab-page practice">
      <header className="page-head">
        <h1>Practice</h1>
      </header>
      <div className="page-body">
        <div className="modes">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button key={m} className="mode" disabled={(m === 'weak' && !weakCount) || (m === 'mycards' && !myCards)} onClick={() => open(m)}>
              <span className="mode-icon" aria-hidden>
                {ICON[m]}
              </span>
              <span className="mode-text">
                <span className="mode-title">{MODE_INFO[m].title}</span>
                <span className="mode-blurb">{MODE_INFO[m].blurb}</span>
                <span className="mode-note">{note[m]}</span>
              </span>
              <span className="mode-go" aria-hidden>
                <ChevronRightIcon />
              </span>
            </button>
          ))}
        </div>

        <button className="settings-card" onClick={() => setPage('settings')}>
          <span className="settings-card-text">
            <span className="pref-name">Session settings</span>
            <span className="pref-hint">
              {area} · {s.sex === 'female' ? 'Female' : 'Male'} · {s.count ? `${s.count} bones` : 'All bones'} · {s.newPerDay} new cards a day
            </span>
          </span>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}

/** Practice settings, on a page of their own. */
function PracticeSettings({ onBack }: { onBack: () => void }) {
  const s = usePrefs((p) => p.study)
  const set = (x: Partial<StudySettings>) => usePrefs.getState().setStudy(x)
  return (
    <div className="tab-page practice">
      <header className="page-head with-back">
        <button className="icon-btn" aria-label="Back to Practice" onClick={onBack}>
          <BackIcon />
        </button>
        <h1>Session settings</h1>
      </header>
      <div className="page-body">
        <Group title="What to study">
          <Chips label="Region" value={s.area} options={AREAS.map((a) => [a.id, a.label] as [string, string])} onChange={(area) => set({ area })} />
          <Choice
            label="Skeleton"
            value={s.sex}
            options={[
              ['male', 'Male'],
              ['female', 'Female'],
            ]}
            onChange={(sex) => set({ sex })}
          />
          <Choice
            label="Bones per session"
            value={s.count}
            options={[
              [10, '10'],
              [20, '20'],
              [50, '50'],
              [0, 'All'],
            ]}
            onChange={(count) => set({ count })}
          />
        </Group>

        <Group title="Timers">
          <Choice
            label="Quiz"
            hint="Time for each question"
            value={s.perQuestion}
            options={[
              [0, 'None'],
              [10, '10 s'],
              [20, '20 s'],
              [30, '30 s'],
            ]}
            onChange={(perQuestion) => set({ perQuestion })}
          />
          <Choice
            label="Spelling Quiz"
            hint="Time for the whole set"
            value={s.timeLimit}
            options={[
              [0, 'None'],
              [60, '1 min'],
              [180, '3 min'],
              [300, '5 min'],
            ]}
            onChange={(timeLimit) => set({ timeLimit })}
          />
        </Group>

        <Group title="Flashcards">
          <Choice
            label="New cards a day"
            hint="Reviews that are due are always shown"
            value={s.newPerDay}
            options={[
              [10, '10'],
              [15, '15'],
              [25, '25'],
            ]}
            onChange={(newPerDay) => set({ newPerDay })}
          />
        </Group>

        <Group title="Sound">
          <Toggle label="Keyboard and answer sounds" checked={s.sound} onChange={(sound) => set({ sound })} />
        </Group>
      </div>
    </div>
  )
}
