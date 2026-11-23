import { topicById } from '../../learn/topics'
import { PageHead } from './PageHead'

/** One topic: its textbook sections or its exam-style questions. */
export function TopicScreen({ area, topic }: { area: 'textbook' | 'exam'; topic: string }) {
  const t = topicById(topic)
  if (!t) return null
  return (
    <div className="tab-page lessons">
      <PageHead eyebrow={area === 'exam' ? 'Exam-style questions' : 'Textbook'} title={t.title} />
      <div className="page-body">
        <p className="muted">{t.blurb}.</p>
        <div className="empty-note">{area === 'exam' ? 'Questions for this topic are being written.' : 'Reading for this topic is being prepared.'}</div>
      </div>
    </div>
  )
}
