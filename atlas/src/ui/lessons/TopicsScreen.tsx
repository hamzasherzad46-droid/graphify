import { useNav } from '../../state/nav'
import { TOPICS } from '../../learn/topics'
import { questionsFor } from '../../learn/questions'
import { ChevronRightIcon } from '../Icons'
import { PageHead } from './PageHead'

/** The topics of the textbook or of the exam-style questions. */
export function TopicsScreen({ area }: { area: 'textbook' | 'exam' }) {
  const push = useNav((s) => s.push)
  const list = area === 'exam' ? TOPICS.filter((t) => !t.textbookOnly) : TOPICS
  return (
    <div className="tab-page lessons">
      <PageHead eyebrow="Lessons" title={area === 'exam' ? 'Exam-style questions' : 'Textbook'} />
      <div className="page-body">
        {area === 'exam' && (
          <p className="muted small">Written in the style of anatomy exams, with the reasoning explained. These are not real university exam papers.</p>
        )}
        <ul className="topic-list">
          {list.map((t, k) => (
            <li key={t.id}>
              <button className="topic-row" onClick={() => push({ kind: 'topic', area, topic: t.id })}>
                <span className="topic-num" aria-hidden>
                  {String(k + 1).padStart(2, '0')}
                </span>
                <span className="topic-text">
                  <span className="topic-title">{t.title}</span>
                  <span className="topic-blurb">{t.blurb}</span>
                  {area === 'exam' && (
                    <span className={`topic-count ${questionsFor(t.id).length ? '' : 'soon'}`}>{questionsFor(t.id).length ? `${questionsFor(t.id).length} questions` : 'Coming soon'}</span>
                  )}
                </span>
                <ChevronRightIcon className="topic-go" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
