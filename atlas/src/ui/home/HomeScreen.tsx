import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePrefs, useViewer } from '../../state/store'
import { useProgress } from '../../state/progress'
import { useNav } from '../../state/nav'
import { useSession, MODE_INFO } from '../../learn/session'
import { AREAS } from '../../learn/pool'
import { useResolvedTheme } from '../../lib/theme'
import { haptic } from '../../lib/feedback'
import { tap } from '../../learn/sound'
import { useToast } from '../toastStore'
import { BookIcon, CalendarIcon, CardsIcon, ChevronRightIcon, CloseIcon, NotesIcon, SpellIcon, UserIcon } from '../Icons'
import { areaLabel, bestTyping, currentStreak, flashcardsToday, goalToday, greeting } from './homeStats'
import { setById } from '../../learn/spelling'
import { sectionInfo, sectionLabel, useReading } from '../../learn/textbook'

const HeroSkeleton = lazy(() => import('../../viewer/HeroSkeleton'))

/** Press feedback for cards: a soft click and a light haptic (the 0.97 scale is CSS :active). */
const press = () => {
  tap()
  haptic('light')
}

function useDocumentVisible() {
  const [v, setV] = useState(() => document.visibilityState === 'visible')
  useEffect(() => {
    const on = () => setV(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return v
}

export function HomeScreen() {
  const name = usePrefs((s) => s.name)
  const theme = useResolvedTheme()
  const sex = useViewer((s) => s.sex)
  const visible = useDocumentVisible()
  // Re-render when progress changes (the stats below read it).
  useProgress((s) => s.sessions)
  useProgress((s) => s.daily)
  useProgress((s) => s.cards)
  usePrefs((s) => s.dailyGoal)
  const [decks, setDecks] = useState(false)
  const toast = useToast((s) => s.show)
  const go = useNav((s) => s.go)
  const open = useSession((s) => s.open)

  const goal = goalToday()
  const cards = flashcardsToday('all')
  const best = bestTyping()
  const streak = currentStreak()
  const last = useProgress.getState().sessions.at(-1)
  const now = new Date()

  return (
    <div className="tab-page home">
      <header className="home-head">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">ATLAS</span>
          <span className="beta" title="Content is a draft until academically reviewed">
            Beta — under academic review
          </span>
        </div>
        <button className="icon-btn profile" aria-label="You" onClick={() => go('you')}>
          <UserIcon />
        </button>
      </header>

      <section className="greet">
        <h1>
          {greeting(now)}
          {name ? `, ${name}` : ''}.
        </h1>
        <p className="muted">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="goal" aria-label={`Today's goal: ${goal.done} of ${goal.goal} answers`}>
          <span className="k">Today’s goal</span>
          <span className="goal-bar" aria-hidden>
            <span style={{ transform: `scaleX(${Math.min(1, goal.done / goal.goal)})` }} />
          </span>
          <span className="goal-num">
            {Math.min(goal.done, goal.goal)}/{goal.goal}
          </span>
        </div>
      </section>

      <button
        className="hero-card"
        onPointerDown={press}
        onClick={() => go('3d')}
        aria-label="3D Body: explore 206 bones. Opens the 3D Atlas."
      >
        <div className="hero-3d" aria-hidden>
          <Suspense fallback={null}>
            <HeroSkeleton theme={theme} sex={sex} active={visible} />
          </Suspense>
        </div>
        <div className="hero-text">
          <span className="hero-title">3D Body</span>
          <span className="hero-sub">Explore 206 bones</span>
        </div>
        <ChevronRightIcon className="hero-go" />
      </button>

      <div className="tiles">
        <Tile icon={<BookIcon />} title="Lessons" stat="Exam questions · Textbook" onClick={() => useNav.getState().push({ kind: 'lessons' })} />
        <Tile
          icon={<CardsIcon />}
          title="Flashcards"
          stat={cards.due ? `${cards.due} due today` : cards.newLeft ? `${cards.newLeft} new today` : 'All caught up'}
          onClick={() => setDecks(true)}
        />
        <Tile
          icon={<SpellIcon />}
          title="Spelling Quiz"
          stat={best === null ? 'Not tried yet' : `Best: ${Math.round(best * 100)}%`}
          onClick={() => open('typing')}
        />
        <Tile icon={<NotesIcon />} title="Notes to Exam" stat="Upload your notes" soon onClick={() => toast('Notes to Exam arrives in a coming update.')} />
      </div>

      <button
        className="row-card"
        onPointerDown={press}
        onClick={() => {
          if (last?.mode === 'typing' && last.set) {
            usePrefs.getState().setStudy({ spellSet: last.set })
            open('typing', { autostart: true })
          } else if (last) {
            usePrefs.getState().setStudy({ area: last.area })
            open(last.mode)
          } else open('typing')
        }}
      >
        <span className="row-k">Continue where you left off</span>
        <span className="row-v">{last ? `${MODE_INFO[last.mode].title} · ${last.set ? (setById(last.set)?.title ?? areaLabel(last.area)) : areaLabel(last.area)}` : 'Start with a Spelling Quiz'}</span>
        <ChevronRightIcon className="row-go" />
      </button>
      <ContinueReading />
      <div className="streak-row">
        <CalendarIcon />
        <span>
          {streak ? (
            <>
              <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'} studied in a row
            </>
          ) : (
            'Study today to start a streak'
          )}
        </span>
      </div>

      {decks && <DeckPicker onClose={() => setDecks(false)} />}
    </div>
  )
}

/** The last textbook section opened, if it isn't finished. Opens with Lessons › Textbook › topic behind it. */
function ContinueReading() {
  const last = useReading((s) => s.last)
  const mark = useReading((s) => (last ? s.marks[last] : undefined))
  const info = last ? sectionInfo(last) : undefined
  if (!info || !mark) return null
  const pct = Math.round(mark.frac * 100)
  if (mark.read && mark.frac > 0.97) return null // finished, and left at the end
  return (
    <button
      className="row-card reading"
      onPointerDown={press}
      onClick={() =>
        useNav.getState().open([{ kind: 'lessons' }, { kind: 'topics', area: 'textbook' }, { kind: 'topic', area: 'textbook', topic: info.topic }, { kind: 'reader', section: info.id }])
      }
    >
      <span className="row-k">Continue reading</span>
      <span className="row-v">{sectionLabel(info)}</span>
      <span className="row-progress" aria-label={`${pct}% read`}>
        <span style={{ transform: `scaleX(${mark.frac})` }} />
      </span>
      <ChevronRightIcon className="row-go" />
    </button>
  )
}

function Tile({ icon, title, stat, soon, onClick }: { icon: ReactNode; title: string; stat: string; soon?: boolean; onClick: () => void }) {
  return (
    <button className={`tile ${soon ? 'soon' : ''}`} onPointerDown={press} onClick={onClick}>
      <span className="tile-icon" aria-hidden>
        {icon}
      </span>
      <span className="tile-title">{title}</span>
      <span className="tile-stat">{stat}</span>
      {soon && <span className="tile-soon">Soon</span>}
    </button>
  )
}

/** Flashcard decks by region, with what is due in each. */
function DeckPicker({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="sheet" role="dialog" aria-modal aria-label="Flashcard decks" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Flashcards</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <p className="muted small">Choose a deck. Cards come back when FSRS schedules them.</p>
        <ul className="decks">
          {AREAS.map((a) => {
            const t = flashcardsToday(a.id)
            return (
              <li key={a.id}>
                <button
                  className="row link"
                  onPointerDown={press}
                  onClick={() => {
                    usePrefs.getState().setStudy({ area: a.id })
                    useSession.getState().open('flashcards')
                  }}
                >
                  <span>{a.label}</span>
                  <span className="deck-count">
                    {t.due ? `${t.due} due` : ''}
                    {t.due && t.newLeft ? ' · ' : ''}
                    {t.newLeft ? `${t.newLeft} new` : ''}
                    {!t.total && 'Done for today'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
