export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0
}

export function weekdayLabels(lang: string): string[] {
  const f = new Intl.DateTimeFormat(lang, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i))) // 1 Jan 2024 was a Monday
}
