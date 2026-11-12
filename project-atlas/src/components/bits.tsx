import type { ReactNode } from 'react'
import { addDays, dayKey } from '../lib/dates'
import type { DayActivity } from '../lib/assignments'
import { useToasts } from '../state/toast'
import { CheckIcon } from './Icons'

/** Progress ring drawn like a dial. */
export function Ring({ value, max, size = 92, stroke = 6, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = max ? Math.min(1, value / max) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunk)" strokeWidth={stroke} />
        {/* tick marks every 10% */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2
          const r1 = r + stroke / 2 + 2
          const r2 = r1 + 3
          return (
            <line
              key={i}
              x1={size / 2 + Math.cos(a) * r1}
              y1={size / 2 + Math.sin(a) * r1}
              x2={size / 2 + Math.cos(a) * r2}
              y2={size / 2 + Math.sin(a) * r2}
              stroke="var(--rule-2)"
              strokeWidth="1"
            />
          )
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={frac >= 1 ? 'var(--moss)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 700ms var(--ease)' }}
        />
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  )
}

export function Meter({ value, max, tone }: { value: number; max: number; tone?: 'accent' | 'moss' }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`meter${tone ? ` ${tone}` : ''}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Monday→Sunday strip of the week with a mark on each active day. */
export function WeekStrip({ days, labels }: { days: { key: string; active: boolean; today: boolean; future: boolean }[]; labels: string[] }) {
  return (
    <div className="week">
      {days.map((d, i) => (
        <div key={d.key} className={`week-day${d.active ? ' on' : ''}${d.today ? ' today' : ''}${d.future ? ' future' : ''}`}>
          <span className="week-mark">{d.active ? <CheckIcon size={12} /> : null}</span>
          <span className="week-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

/** 12-week activity grid (most recent week last). */
export function Heatmap({ days, now = new Date() }: { days: Record<string, DayActivity>; now?: Date }) {
  const end = addDays(now, 6 - ((now.getDay() + 6) % 7)) // Sunday of this week
  const start = addDays(end, -7 * 12 + 1)
  const cells = Array.from({ length: 7 * 12 }, (_, i) => {
    const d = addDays(start, i)
    const k = dayKey(d)
    const a = days[k]
    const n = (a?.answered ?? 0) + (a?.cards ?? 0)
    const level = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4
    return { k, level, future: d > now }
  })
  return (
    <div className="heat" aria-hidden>
      {cells.map((c) => (
        <span key={c.k} className={`heat-cell l${c.level}${c.future ? ' future' : ''}`} />
      ))}
    </div>
  )
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-title">{t.title}</span>
          {t.detail && <span className="toast-detail">{t.detail}</span>}
        </div>
      ))}
    </div>
  )
}
