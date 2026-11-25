import { useEffect } from 'react'
import { PageHead } from '../lessons/PageHead'
import { useNoteDocs, shortName, type NoteDoc, type Part } from '../../learn/notesDocs'
import { docStatus } from './docStatus'

const STATE_LABEL: Partial<Record<Part['state'], string>> = {
  waiting: 'Waiting to be read',
  reading: 'Reading…',
  failed: 'Not read yet',
  illegible: 'Could not be read',
}

/** One file's text, page by page or slide by slide: check what Atlas read, and correct it. */
export function NotesDocScreen({ id }: { id: string }) {
  const doc = useNoteDocs((s) => s.docs.find((d) => d.id === id))
  useEffect(() => void useNoteDocs.getState().load(), [])
  if (!doc)
    return (
      <div className="tab-page lessons notes">
        <PageHead eyebrow="Notes to Exam" title="File" />
        <div className="page-body">
          <p className="muted">This file has been removed.</p>
        </div>
      </div>
    )
  const failed = doc.parts.some((p) => p.state === 'failed')
  return (
    <div className="tab-page lessons notes">
      <PageHead eyebrow="Notes to Exam · check the text" title={shortName(doc.name)} />
      <div className="page-body">
        <p className="muted small">{docStatus(doc).line}</p>
        <p className="muted small">Correct anything Atlas misread: questions are written on this text. Changes save as you type.</p>
        {failed && (
          <button className="btn ghost small" onClick={() => useNoteDocs.getState().retry(doc.id)}>
            Try reading again
          </button>
        )}
        {doc.skippedPictures > 0 && <p className="muted small">Pictures inside Word files are not read. If a picture holds notes, add it as a photo.</p>}
        <ol className="part-list">
          {doc.parts.map((p) => (
            <PartItem key={p.id} doc={doc} p={p} />
          ))}
        </ol>
      </div>
    </div>
  )
}

function PartItem({ doc, p }: { doc: NoteDoc; p: Part }) {
  const text = p.text
  const label = STATE_LABEL[p.state]
  const rows = Math.min(14, Math.max(3, text.split('\n').length + 1))
  return (
    <li className={`part ${p.state}`}>
      <div className="part-head">
        <span className="part-ref">{p.ref.charAt(0).toUpperCase() + p.ref.slice(1)}</span>
        {p.origin === 'read' && p.state === 'ready' && <span className="tag part-tag">Read from an image</span>}
        {p.origin === 'read' && p.state === 'ready' && p.legibility === 'partly' && !p.edited && <span className="tag part-tag warn">Check the [illegible] words</span>}
        {p.edited && <span className="tag part-tag">Edited</span>}
        {label && <span className={`tag part-tag ${p.state === 'failed' || p.state === 'illegible' ? 'bad' : ''}`}>{label}</span>}
      </div>
      {p.title && <p className="part-title">{p.title}</p>}
      {p.state === 'waiting' || p.state === 'reading' ? (
        <p className="muted small">The text appears here once it has been read.</p>
      ) : (
        <textarea
          className="part-text"
          aria-label={`Text of ${p.ref}`}
          rows={rows}
          value={text}
          placeholder={p.state === 'illegible' ? 'Atlas could not read this page. Type its text here, or leave it empty to skip it.' : 'No text on this page.'}
          onChange={(e) => useNoteDocs.getState().editPart(doc.id, p.id, e.target.value)}
        />
      )}
      {p.notes && (
        <div className="part-notes">
          <span className="k">Speaker notes</span>
          <p>{p.notes}</p>
        </div>
      )}
    </li>
  )
}
