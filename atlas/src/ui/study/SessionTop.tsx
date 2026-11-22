import type { ReactNode } from 'react'
import { CloseIcon } from '../Icons'

/** Study header: title, progress, optional timer, close. */
export function SessionTop({ title, index, total, timer, timerFrac, onClose, children }: {
  title: string
  index: number
  total: number
  timer?: string
  timerFrac?: number // 0–1 remaining, drawn as a thin bar
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <header className="study-top">
      <div className="study-row">
        <span className="study-title">{title}</span>
        <span className="study-count" aria-label={`Question ${Math.min(index + 1, total)} of ${total}`}>
          {Math.min(index + 1, total)} / {total}
        </span>
        {timer && <span className="study-timer">{timer}</span>}
        <button className="icon-btn" aria-label="End session" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="study-progress" aria-hidden>
        <span style={{ transform: `scaleX(${total ? index / total : 0})` }} />
      </div>
      {timerFrac !== undefined && (
        <div className="study-qtimer" aria-hidden>
          <span style={{ transform: `scaleX(${timerFrac})` }} />
        </div>
      )}
      {children}
    </header>
  )
}
