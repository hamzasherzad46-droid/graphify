import { useProgress, today } from '../../state/progress'
import { usePrefs } from '../../state/store'
import { deckFor } from '../../learn/decks'
import { streak } from '../../learn/mastery'
import { AREAS } from '../../learn/pool'

/** Flashcards to study today in an area: due reviews plus new cards still allowed today. */
export function flashcardsToday(area: string) {
  const p = useProgress.getState()
  const deck = deckFor(area)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const due = deck.filter((c) => p.cards[c.id] && new Date(p.cards[c.id].due) <= end).length
  const newDone = p.newToday.date === today() ? p.newToday.count : 0
  const unseen = deck.filter((c) => c.dir === 'see' && !p.cards[c.id]).length
  const newLeft = Math.max(0, Math.min(unseen, usePrefs.getState().study.newPerDay - newDone))
  return { due, newLeft, total: due + newLeft }
}

/** Best Typing Test accuracy (sessions with at least 5 answers), 0–1, or null. */
export function bestTyping() {
  const s = useProgress.getState().sessions.filter((x) => x.mode === 'typing' && x.answered >= 5)
  return s.length ? Math.max(...s.map((x) => x.correct / x.answered)) : null
}

export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? 'Whole skeleton'

export function goalToday() {
  const daily = useProgress.getState().daily
  return { done: daily[today()] ?? 0, goal: usePrefs.getState().dailyGoal }
}

export const currentStreak = () => streak(useProgress.getState().days, today()).current

export function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
