export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0
}
