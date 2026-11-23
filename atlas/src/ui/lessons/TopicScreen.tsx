import { topicById } from '../../learn/topics'
import { minutes, sectionLabel, sectionsFor, useReading } from '../../learn/textbook'
import { useNav } from '../../state/nav'
import { ChevronRightIcon } from '../Icons'
import { PageHead } from './PageHead'
import { ExamQuestions } from './ExamQuestions'

/** One topic: its textbook sections or its exam-style questions. */
export function TopicScreen({ area, topic, anchor }: { area: 'textbook' | 'exam'; topic: string; anchor?: string }) {
  const t = topicById(topic)
  const marks = useReading((s) => s.marks)
  const push = useNav((s) => s.push)
  if (!t) return null
  const sections = sectionsFor(topic)
  return (
    <div className="tab-page lessons">
      <PageHead eyebrow={area === 'exam' ? 'Exam-style questions' : 'Textbook'} title={t.title} />
      <div className="page-body">
        <p className="muted">{t.blurb}.</p>
        {area === 'exam' && <p className="muted small exam-note">Exam-style questions: written in the style of anatomy exams, with the reasoning explained. Not real exam papers.</p>}
        {area === 'exam' ? (
          <ExamQuestions topic={topic} anchor={anchor} />
        ) : (
          <ul className="topic-list">
            {sections.map((s) => {
              const m = marks[s.id]
              const done = m ? (m.read ? 100 : Math.round(m.frac * 100)) : 0
              return (
                <li key={s.id}>
                  <button className="topic-row section-row" onClick={() => push({ kind: 'reader', section: s.id })}>
                    <span className="topic-text">
                      <span className="topic-title">{sectionLabel(s)}</span>
                      <span className="topic-blurb">
                        Chapter {s.chapter} · {minutes(s)} min read · {s.figures} {s.figures === 1 ? 'figure' : 'figures'}
                        {done > 0 && <span className="read-done"> · {m?.read ? 'Read' : `${done}% read`}</span>}
                      </span>
                      {done > 0 && (
                        <span className="row-progress" aria-hidden>
                          <span style={{ transform: `scaleX(${done / 100})` }} />
                        </span>
                      )}
                    </span>
                    <ChevronRightIcon className="topic-go" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
