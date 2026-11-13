import { addDays, dayKey } from './dates'

/**
 * Consecutive active days ending today, or ending yesterday if today has no
 * activity yet (so the streak isn't shown as broken before you've studied today).
 */
export function currentStreak(activeDays: Set<string>, now = new Date()): number {
  let d = activeDays.has(dayKey(now)) ? now : addDays(now, -1)
  let n = 0
  while (activeDays.has(dayKey(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** Monday→Sunday of the current week, with whether each day was active. */
export function weekStrip(activeDays: Set<string>, now = new Date()): { key: string; active: boolean; today: boolean; future: boolean }[] {
  const monday = addDays(now, -((now.getDay() + 6) % 7))
  const today = dayKey(now)
  return Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(addDays(monday, i))
    return { key, active: activeDays.has(key), today: key === today, future: key > today }
  })
}
