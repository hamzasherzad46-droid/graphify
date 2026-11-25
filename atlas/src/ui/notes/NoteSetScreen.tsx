import { useState } from 'react'
import { PageHead } from '../lessons/PageHead'
import { ExamProgress, QuestionCard } from '../lessons/ExamQuestions'
import { useJumpToQuestion } from '../lessons/useJumpToQuestion'
import { Portal } from '../Portal'
import { TrashIcon } from '../Icons'
import { useNav } from '../../state/nav'
import { useExam, LEVEL_LABEL } from '../../learn/questions'
import { useAnnotations } from '../../learn/annotations'
import { AI_SOURCE, useNoteSets, type NoteSet } from '../../learn/notesExam'
import { useToast } from '../toastStore'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function fromText(s: NoteSet) {
  if (s.from.files?.length) return s.from.files.length > 1 ? `${s.from.files.slice(0, -1).join(', ')} and ${s.from.files.at(-1)}` : s.from.files[0]
  const parts = [s.from.pages ? `${plural(s.from.pages, 'page')} of notes` : '', s.from.pdf ? 'your PDF' : '', s.from.typed ? 'your typed notes' : ''].filter(Boolean)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
}

/** What the second examiner did, in a sentence. */
function reviewText(r: NoteSet['review']): string {
  const bits = [r.kept ? `${r.kept} kept as written` : '', r.fixed ? `${r.fixed} corrected` : '', r.dropped ? `${r.dropped} removed` : ''].filter(Boolean)
  if (!bits.length) return 'A second examiner checked every question.'
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits.at(-1)}` : bits[0]
  return `Checked by a second examiner: ${list}.`
}

/** A saved question set: what the examiner found in the notes, then the questions. */
export function NoteSetScreen({ id, anchor }: { id: string; anchor?: string }) {
  const set = useNoteSets((s) => s.sets[id])
  const ready = useNoteSets((s) => s.ready)
  const [confirm, setConfirm] = useState(false)
  useJumpToQuestion(set ? anchor : undefined)

  if (!set)
    return (
      <div className="tab-page lessons notes">
        <PageHead eyebrow="Notes to Exam" title="Question set" />
        <div className="page-body">
          <p className="muted">{ready ? 'This set has been deleted.' : 'Opening…'}</p>
        </div>
      </div>
    )

  const date = new Date(set.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="tab-page lessons notes">
      <PageHead eyebrow="Notes to Exam" title={set.title}>
        <button className="icon-btn" aria-label="Delete this set" onClick={() => setConfirm(true)}>
          <TrashIcon />
        </button>
      </PageHead>
      <div className="page-body">
        <p className="set-meta">
          {plural(set.questions.length, 'question')} · {LEVEL_LABEL[set.settings.level]} · from {fromText(set)} · {date}
        </p>
        <p className="set-review">{reviewText(set.review)}</p>

        {set.corrections.length > 0 && (
          <section className="corrections" aria-label="Check these in your notes">
            <h3>Check these in your notes</h3>
            <p className="muted small">The examiners think these lines are not right. No questions were set on them.</p>
            <ul>
              {set.corrections.map((c, k) => (
                <li key={k}>
                  <p className="c-quote">
                    <span className="c-k">You wrote</span> “{c.quote}”
                  </p>
                  <p className="c-problem">{c.problem}</p>
                  <p className="c-fix">
                    <span className="c-k">Correct</span> {c.correction}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ExamProgress questions={set.questions} />
        <ol className="q-list">
          {set.questions.map((q, k) => (
            <li key={q.id}>
              <QuestionCard q={q} n={k + 1} topicTitle={set.title} label={`Notes to Exam: ${set.title}, question ${k + 1}`} />
            </li>
          ))}
        </ol>

        <details className="transcript">
          <summary>What Atlas read from your notes</summary>
          <p className="muted small">Compare this with your pages: if a word was misread, the questions on it may be affected.</p>
          <div className="transcript-text">{set.transcript}</div>
        </details>

        <p className="q-source set-source">{AI_SOURCE}</p>
      </div>

      {confirm && <DeleteSet set={set} onClose={() => setConfirm(false)} />}
    </div>
  )
}

function DeleteSet({ set, onClose }: { set: NoteSet; onClose: () => void }) {
  const toast = useToast((s) => s.show)
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <aside className="sheet" role="dialog" aria-modal aria-label="Delete this set?" onClick={(e) => e.stopPropagation()}>
          <h2>Delete this set?</h2>
          <p className="muted">“{set.title}”, its answers, and any highlights and notes you made on it are removed from this device.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onClose}>
              Keep it
            </button>
            <button
              className="btn danger"
              onClick={() => {
                const ids = set.questions.map((q) => q.id)
                useExam.getState().reset(ids)
                const docs = new Set(ids.map((q) => `eq:${q}`))
                const ann = useAnnotations.getState()
                for (const a of Object.values(ann.items)) if (docs.has(a.doc) && !a.deletedAt) ann.remove(a.id)
                void useNoteSets.getState().remove(set.id)
                onClose()
                useNav.getState().back()
                toast('Set deleted.')
              }}
            >
              Delete
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  )
}
