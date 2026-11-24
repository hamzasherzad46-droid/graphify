import { useNav } from '../../state/nav'
import { TOPICS } from '../../learn/topics'
import { haptic } from '../../lib/feedback'
import { tap } from '../../learn/sound'
import { BookIcon, ChevronRightIcon, QuestionIcon } from '../Icons'
import { PageHead } from './PageHead'
import { NoteGlyph } from './Annotatable'
import { useAnnotations } from '../../learn/annotations'

const press = () => {
  tap()
  haptic('light')
}

const REGIONS = TOPICS.filter((t) => !t.textbookOnly)

/** Lessons: two ways in, both organised by region. */
export function LessonsScreen() {
  const push = useNav((s) => s.push)
  const items = useAnnotations((s) => s.items)
  const live = Object.values(items).filter((a) => !a.deletedAt)
  const counts = { highlights: live.filter((a) => a.color && a.segs.length).length, notes: live.filter((a) => a.note.trim()).length }
  return (
    <div className="tab-page lessons">
      <PageHead title="Lessons" />
      <div className="page-body">
        <button className="lesson-card" onPointerDown={press} onClick={() => push({ kind: 'topics', area: 'exam' })}>
          <span className="lesson-icon" aria-hidden>
            <QuestionIcon />
          </span>
          <span className="lesson-title">Exam-style questions</span>
          <span className="lesson-sub">Likely exam questions, answered and explained</span>
          <span className="lesson-topics">{REGIONS.map((t) => t.title).join(' · ')}</span>
          <ChevronRightIcon className="lesson-go" />
        </button>
        <button className="lesson-card" onPointerDown={press} onClick={() => push({ kind: 'topics', area: 'textbook' })}>
          <span className="lesson-icon" aria-hidden>
            <BookIcon />
          </span>
          <span className="lesson-title">Textbook</span>
          <span className="lesson-sub">Full university-level reading, by topic</span>
          <span className="lesson-topics">{TOPICS.map((t) => t.title).join(' · ')}</span>
          <ChevronRightIcon className="lesson-go" />
        </button>
        <div className="mine-links">
          <button className="topic-row" onClick={() => push({ kind: 'mine', what: 'highlights' })}>
            <span className="mine-swatches" aria-hidden>
              <span className="dot hl-yellow" />
              <span className="dot hl-teal" />
              <span className="dot hl-pink" />
              <span className="dot hl-blue" />
            </span>
            <span className="topic-text">
              <span className="topic-title">My Highlights</span>
              <span className="topic-blurb">{counts.highlights ? `${counts.highlights} saved` : 'Nothing highlighted yet'}</span>
            </span>
            <ChevronRightIcon className="topic-go" />
          </button>
          <button className="topic-row" onClick={() => push({ kind: 'mine', what: 'notes' })}>
            <span className="mine-swatches" aria-hidden>
              <NoteGlyph />
            </span>
            <span className="topic-text">
              <span className="topic-title">My Notes</span>
              <span className="topic-blurb">{counts.notes ? `${counts.notes} saved` : 'No notes yet'}</span>
            </span>
            <ChevronRightIcon className="topic-go" />
          </button>
        </div>
        <p className="muted small lesson-foot">Skeletal system now, with nervous system and blood vessel chapters to read. Muscles and other systems follow.</p>
      </div>
    </div>
  )
}
