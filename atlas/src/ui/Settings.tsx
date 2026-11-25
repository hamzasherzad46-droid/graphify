import type { ReactNode } from 'react'
import { ChevronRightIcon } from './Icons'

/**
 * Settings building blocks, shared by You and Practice: a titled group of rows on one card. Each row has room to
 * breathe: the label (and an optional hint) on its own line, with the control beside it (switches, links) or below it
 * at full width (choices), so nothing is squeezed onto one line.
 */

export function Group({ title, note, children }: { title?: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="pref-group">
      {title && <h2 className="pref-group-title">{title}</h2>}
      <div className="pref-card">{children}</div>
      {note && <p className="pref-note">{note}</p>}
    </section>
  )
}

function Label({ label, hint, id }: { label: ReactNode; hint?: ReactNode; id?: string }) {
  return (
    <span className="pref-label">
      <span className="pref-name" id={id}>
        {label}
      </span>
      {hint && <span className="pref-hint">{hint}</span>}
    </span>
  )
}

/** A choice of a few values: equal-width segments across the card. */
export function Choice<T extends string | number>({ label, hint, value, options, onChange }: { label: string; hint?: ReactNode; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="pref-row stack">
      <Label label={label} hint={hint} />
      <div className="seg" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(([v, l]) => (
          <button key={String(v)} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Many values (regions): chips that wrap onto as many lines as they need. */
export function Chips<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: ReactNode; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="pref-row stack">
      <Label label={label} hint={hint} />
      <div className="pref-chips" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} role="radio" aria-checked={value === v} className={`chip ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pref-row">
      <Label label={label} hint={hint} />
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

/** A row that opens something, downloads something or acts. */
export function LinkRow({
  label,
  hint,
  value,
  onClick,
  disabled,
  danger,
  end,
}: {
  label: string
  hint?: ReactNode
  value?: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  end?: ReactNode
}) {
  return (
    <button className={`pref-row link ${danger ? 'danger' : ''}`} disabled={disabled} onClick={onClick}>
      <Label label={label} hint={hint} />
      {value !== undefined && <span className="pref-value">{value}</span>}
      <span className="pref-end" aria-hidden>
        {end ?? <ChevronRightIcon />}
      </span>
    </button>
  )
}

/** A text box or list with its label above it. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="pref-row stack field-row">
      <Label label={label} />
      {children}
    </label>
  )
}
