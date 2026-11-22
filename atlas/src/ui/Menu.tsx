import { useState } from 'react'
import { usePrefs, useViewer, type Theme } from '../state/store'
import { CloseIcon } from './Icons'
import { Credits } from './Credits'
import { Disclaimer } from './Disclaimer'

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Menu({ onClose }: { onClose: () => void }) {
  const p = usePrefs()
  const labels = useViewer((s) => s.labels)
  const [page, setPage] = useState<'menu' | 'credits' | 'disclaimer'>('menu')
  if (page === 'credits') return <Credits onBack={() => setPage('menu')} />
  if (page === 'disclaimer') return <Disclaimer onClose={() => setPage('menu')} />
  const reviews = Object.keys(p.reviewOverrides).length

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="sheet" role="dialog" aria-modal aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Settings</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <div className="row">
          <span>Appearance</span>
          <div className="segmented small">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button key={t} className={p.theme === t ? 'on' : ''} onClick={() => p.setTheme(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <label className="row">
          <span>Labels</span>
          <input type="checkbox" className="switch" checked={labels} onChange={(e) => useViewer.getState().setLabels(e.target.checked)} />
        </label>
        <button className="row link" onClick={() => setPage('credits')}>
          Credits and attribution <span aria-hidden>›</span>
        </button>
        <button className="row link" onClick={() => setPage('disclaimer')}>
          Educational use disclaimer <span aria-hidden>›</span>
        </button>

        <h3 className="sheet-sub">For academic reviewers</h3>
        <label className="row">
          <span>Reviewer mode</span>
          <input type="checkbox" className="switch" checked={p.reviewerMode} onChange={(e) => p.setReviewerMode(e.target.checked)} />
        </label>
        {p.reviewerMode && (
          <>
            <label className="field">
              <span>Reviewer name</span>
              <input value={p.reviewerName} onChange={(e) => p.setReviewerName(e.target.value)} placeholder="Shown on reviewed bones" />
            </label>
            <p className="muted small">
              Each bone panel now has a “Mark as academically reviewed” switch. Changes stay on this device until exported and applied to
              content/bones.
            </p>
            <button className="row link" disabled={!reviews} onClick={() => download('atlas-reviews.json', p.reviewOverrides)}>
              Export review changes ({reviews}) <span aria-hidden>↓</span>
            </button>
          </>
        )}
        <button className="row link" disabled={!p.reports.length} onClick={() => download('atlas-error-reports.json', p.reports)}>
          Export error reports ({p.reports.length}) <span aria-hidden>↓</span>
        </button>
        <p className="muted small version">Atlas · Phase 1 (skeleton) · content draft</p>
      </aside>
    </div>
  )
}
