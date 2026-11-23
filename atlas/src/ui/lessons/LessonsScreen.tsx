import { useNav } from '../../state/nav'
import { TOPICS } from '../../learn/topics'
import { haptic } from '../../lib/feedback'
import { tap } from '../../learn/sound'
import { BookIcon, ChevronRightIcon, QuestionIcon } from '../Icons'
import { PageHead } from './PageHead'

const press = () => {
  tap()
  haptic('light')
}

const REGIONS = TOPICS.filter((t) => !t.textbookOnly)

/** Lessons: two ways in, both organised by region. */
export function LessonsScreen() {
  const push = useNav((s) => s.push)
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
        <p className="muted small lesson-foot">Skeletal system now. Muscles, vessels and other systems follow.</p>
      </div>
    </div>
  )
}
