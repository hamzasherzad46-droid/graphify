import { Rating } from 'ts-fsrs'
import { isCorrect, type ExamAnswer, type Question } from './questions'
import { review } from './deck'
import { useProgress } from '../state/progress'
import { isGeneratedId, reviewKey } from './notesExam'

/**
 * After an answer to a question written from the student's notes: schedule it for spaced review (right → Good,
 * wrong → Again). Answering again on the same day changes nothing; a later answer is a review. Kept apart from
 * notesExam.ts so Home does not load the scheduler.
 */
export function scheduleAnswer(q: Question, a: ExamAnswer | undefined, now = new Date()) {
  if (!a || !isGeneratedId(q.id)) return
  const p = useProgress.getState()
  const key = reviewKey(q.id)
  const old = p.cards[key]
  if (old?.last_review && old.last_review.slice(0, 10) === now.toISOString().slice(0, 10)) return
  p.saveCard(key, review(old, isCorrect(q, a) ? Rating.Good : Rating.Again, now), !old)
}
