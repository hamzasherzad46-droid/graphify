import type { ReactNode } from 'react'
import { useNav } from '../../state/nav'
import { BackIcon } from '../Icons'

/** Header of a page opened from Home: back, an eyebrow, the title, and optional actions on the right. */
export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  const back = useNav((s) => s.back)
  return (
    <header className="sub-head">
      <button className="icon-btn" aria-label="Back" onClick={back}>
        <BackIcon />
      </button>
      <div className="sub-title">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
      </div>
      {children && <div className="sub-actions">{children}</div>}
    </header>
  )
}
