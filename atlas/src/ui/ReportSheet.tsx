import { useState } from 'react'
import type { Bone } from '../data/types'
import { usePrefs } from '../state/store'
import { useToast } from './toastStore'
import appConfig from '../../content/app.json'

const CATEGORIES = ['Name or Latin name', 'Region, side or type', 'Key features', 'Articulations', 'Clinical relevance', '3D model', 'Other']

export function ReportSheet({ bone, onClose }: { bone: Bone; onClose: () => void }) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const addReport = usePrefs((s) => s.addReport)
  const toast = useToast((s) => s.show)

  const submit = () => {
    const report = { boneId: bone.id, category, message: message.trim(), createdAt: new Date().toISOString() }
    addReport(report)
    if (appConfig.reportEmail) {
      const body = `Bone: ${bone.name} (${bone.id})\nCategory: ${category}\n\n${report.message}`
      window.location.href = `mailto:${appConfig.reportEmail}?subject=${encodeURIComponent(`Atlas error report: ${bone.name}`)}&body=${encodeURIComponent(body)}`
    }
    toast('Thanks — report saved. Reviewers can export reports from the menu.')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal aria-labelledby="report-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="report-title">Report an error</h2>
        <p className="muted">
          {bone.name}
          {bone.side !== 'midline' ? ` (${bone.side})` : ''}
        </p>
        <label className="field">
          <span>What is wrong?</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Details</span>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What should it say, and your source if you have one." />
        </label>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!message.trim()} onClick={submit}>
            Send report
          </button>
        </div>
      </div>
    </div>
  )
}
