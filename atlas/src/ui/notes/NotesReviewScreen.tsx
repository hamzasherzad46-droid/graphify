import { useEffect, useMemo } from 'react'
import { PageHead } from '../lessons/PageHead'
import { QuestionCard } from '../lessons/ExamQuestions'
import { useExam } from '../../learn/questions'
import { dueQuestions, useNoteSets } from '../../learn/notesExam'
import { useProgress } from '../../state/progress'

/**
 * Today's review: questions from the student's sets that spaced review (FSRS) has brought back. Each starts unanswered;
 * answering it schedules the next review.
 */
export function NotesReviewScreen() {
  const sets = useNoteSets((s) => s.sets)
  const cards = useProgress((s) => s.cards)
  // The list is fixed when the page opens, so a question answered now stays on the page.
  const loaded = Object.keys(sets).length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const due = useMemo(() => dueQuestions(sets, cards), [loaded])
  useEffect(() => {
    // A review is a fresh attempt: clear the old answers of the questions brought back.
    useExam.getState().reset(due.map((d) => d.q.id))
  }, [due])
  return (
    <div className="tab-page lessons notes">
      <PageHead eyebrow="Notes to Exam" title="Review" />
      <div className="page-body">
        {due.length ? (
          <>
            <p className="muted">Questions from your sets, brought back at the right time to make them stick. Answer each one again.</p>
            <ol className="q-list">
              {due.map(({ q, set }, k) => (
                <li key={q.id}>
                  <p className="muted small review-from">{set.title}</p>
                  <QuestionCard q={q} n={k + 1} topicTitle={set.title} label={`Notes to Exam: ${set.title}`} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="muted">Nothing is due for review. Questions you answer in your sets come back here when it is time.</p>
        )}
      </div>
    </div>
  )
}
