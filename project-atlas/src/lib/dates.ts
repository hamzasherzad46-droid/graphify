/** Local-date keys used for activity logs and assignment periods. */

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Monday of the week containing d. */
export function weekStart(d = new Date()): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7))
  return r
}

export function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export type Period = 'day' | 'week' | 'month'

export function periodStart(period: Period, d = new Date()): Date {
  return period === 'day' ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : period === 'week' ? weekStart(d) : monthStart(d)
}

export function periodEnd(period: Period, d = new Date()): Date {
  const s = periodStart(period, d)
  return period === 'day' ? addDays(s, 1) : period === 'week' ? addDays(s, 7) : new Date(s.getFullYear(), s.getMonth() + 1, 1)
}

/** Stable key for a period, e.g. "week:2026-11-09". */
export function periodKey(period: Period, d = new Date()): string {
  return `${period}:${dayKey(periodStart(period, d))}`
}

/** Day keys from the start of the period up to and including today. */
export function daysInPeriodSoFar(period: Period, d = new Date()): string[] {
  const out: string[] = []
  const today = dayKey(d)
  for (let c = periodStart(period, d); ; c = addDays(c, 1)) {
    const k = dayKey(c)
    out.push(k)
    if (k === today) return out
  }
}
