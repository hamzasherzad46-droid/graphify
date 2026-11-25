import { useEffect, useState } from 'react'
import { PageHead } from '../lessons/PageHead'
import { ExamProgress, QuestionCard } from '../lessons/ExamQuestions'
import { useJumpToQuestion } from '../lessons/useJumpToQuestion'
import { Portal } from '../Portal'
import { CardsIcon, TrashIcon } from '../Icons'
import { useNav } from '../../state/nav'
import { useExam, isCorrect, isDone, LEVEL_LABEL } from '../../learn/questions'
import { useAnnotations } from '../../learn/annotations'
import { useMyCards } from '../../learn/mycards'
import { useSession, mmss } from '../../learn/session'
import { useNoteDocs } from '../../learn/notesDocs'
import { AI_SOURCE, apiReady, isWriting, missedIn, MODE_INFO, NotesError, startSet, stopSet, topicCoverage, useNoteSets, type NoteSet } from '../../learn/notesExam'
import { useToast } from '../toastStore'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : (xs[0] ?? ''))

function fromText(s: NoteSet) {
  if (s.from.files?.length) return list(s.from.files)
  return list([s.from.pages ? `${plural(s.from.pages, 'page')} of notes` : '', s.from.pdf ? 'your PDF' : '', s.from.typed ? 'your typed notes' : ''].filter(Boolean))
}

/** What the second examiner did, in a sentence. */
function reviewText(r: NoteSet['review']): string {
  const bits = [r.kept ? `${r.kept} kept as written` : '', r.fixed ? `${r.fixed} corrected` : '', r.dropped ? `${r.dropped} removed` : ''].filter(Boolean)
  if (!bits.length) return 'A second examiner checks every question.'
  return `Checked by a second examiner: ${list(bits)}.`
}

/** A saved set: progress while it is written, then the questions (or cards), what the examiners found, and coverage. */
export function NoteSetScreen({ id, anchor }: { id: string; anchor?: string }) {
  const set = useNoteSets((s) => s.sets[id])
  const ready = useNoteSets((s) => s.ready)
  const answers = useExam((s) => s.answers)
  const [confirm, setConfirm] = useState(false)
  useJumpToQuestion(set ? anchor : undefined)
  useEffect(() => void useNoteDocs.getState().load(), [])

  if (!set)
    return (
      <div className="tab-page lessons notes">
        <PageHead eyebrow="Notes to Exam" title="Set" />
        <div className="page-body">
          <p className="muted">{ready ? 'This set has been deleted.' : 'Opening…'}</p>
        </div>
      </div>
    )

  const mode = set.settings.mode ?? 'quick'
  const writing = set.status === 'writing' && isWriting(set.id)
  const date = new Date(set.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const mock = mode === 'mock'
  const finished = !mock || !!set.finishedAt
  const done = set.questions.filter((q) => isDone(q, answers[q.id])).length
  const sections = [...new Set(set.questions.map((q) => q.section ?? ''))]

  return (
    <div className="tab-page lessons notes">
      <PageHead eyebrow={`Notes to Exam · ${MODE_INFO[mode].label}`} title={set.title}>
        <button className="icon-btn" aria-label="Delete this set" onClick={() => setConfirm(true)}>
          <TrashIcon />
        </button>
      </PageHead>
      <div className="page-body">
        <p className="set-meta">
          {mode === 'flashcards' ? plural(set.cards?.length ?? 0, 'card') : plural(set.questions.length, 'question')}
          {mode !== 'flashcards' && ` · ${LEVEL_LABEL[set.settings.level]}`} · from {fromText(set)} · {date}
          {set.module && ` · ${set.module}`}
        </p>

        {writing ? <Writing set={set} /> : <p className="set-review">{reviewText(set.review)}</p>}
        {!writing && set.status === 'stopped' && <p className="notes-banner">Writing stopped before the end. The {mode === 'flashcards' ? 'cards' : 'questions'} written so far are kept.</p>}
        {!writing && set.status === 'error' && !set.questions.length && !set.cards?.length && (
          <div className="notes-banner bad" role="alert">
            <strong>Nothing could be written.</strong> {set.errors?.at(-1)}
          </div>
        )}
        {set.errors && set.errors.length > 0 && set.status !== 'error' && (
          <details className="set-errors">
            <summary>{plural(set.errors.length, 'topic')} could not be written</summary>
            <ul>
              {set.errors.map((e, k) => (
                <li key={k}>{e}</li>
              ))}
            </ul>
          </details>
        )}

        <Findings set={set} />

        {mode === 'flashcards' ? (
          <FlashcardList set={set} />
        ) : (
          <>
            {mock && <MockBar set={set} done={done} />}
            {/* A mock exam has its own score (of all questions) in the bar above. */}
            {finished && !mock && set.questions.length > 0 && <ExamProgress questions={set.questions} />}
            {sections.map((sec) => (
              <section key={sec || 'all'} className="set-section">
                {sections.length > 1 && sec && <h3 className="set-section-title">{sec}</h3>}
                <ol className="q-list">
                  {set.questions.map((q, k) =>
                    (q.section ?? '') === sec ? (
                      <li key={q.id}>
                        <QuestionCard q={q} n={k + 1} topicTitle={set.title} label={`Notes to Exam: ${set.title}, question ${k + 1}`} deferReveal={!finished} />
                      </li>
                    ) : null,
                  )}
                </ol>
              </section>
            ))}
            {finished && done > 0 && <Coverage set={set} />}
          </>
        )}

        {set.transcript && (
          <details className="transcript">
            <summary>What Atlas read from your notes</summary>
            <div className="transcript-text">{set.transcript}</div>
          </details>
        )}
        <p className="q-source set-source">{AI_SOURCE}</p>
      </div>

      {confirm && <DeleteSet set={set} onClose={() => setConfirm(false)} />}
    </div>
  )
}

/** While the set is being written: how far it has got, and a way to stop. */
function Writing({ set }: { set: NoteSet }) {
  const p = set.progress ?? { done: 0, total: 0 }
  const items = set.questions.length + (set.cards?.length ?? 0)
  return (
    <div className="writing-bar" role="status" aria-live="polite">
      <div className="writing-line">
        <span className="working-mark small" aria-hidden>
          <span />
        </span>
        <span>
          {items ? `${plural(items, set.settings.mode === 'flashcards' ? 'card' : 'question')} ready, checked by a second examiner. ` : 'Writing the first questions… '}
          {p.total > 0 && `Topics: ${p.done} of ${p.total}.`}
        </span>
        <button className="link-btn" onClick={() => stopSet(set.id)}>
          Stop
        </button>
      </div>
      {p.total > 0 && (
        <span className="row-progress" aria-hidden>
          <span style={{ transform: `scaleX(${p.done / p.total})` }} />
        </span>
      )}
      <p className="muted small">You can start answering now; more appear as each topic is checked.</p>
    </div>
  )
}

/** Mock exam: a timer while it is taken, then Finish to see the answers and the score. */
function MockBar({ set, done }: { set: NoteSet; done: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (set.finishedAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [set.finishedAt])
  const answers = useExam((s) => s.answers)
  const start = new Date(set.createdAt).getTime()
  const end = set.finishedAt ? new Date(set.finishedAt).getTime() : now
  const right = set.questions.filter((q) => isCorrect(q, answers[q.id])).length
  if (set.finishedAt)
    return (
      <div className="mock-bar done">
        <strong>
          Score: {right} of {set.questions.length} ({Math.round((100 * right) / Math.max(1, set.questions.length))}%)
        </strong>
        <span className="muted small">Time taken {mmss((end - start) / 1000)}. Short answers count when marked or self-marked.</span>
      </div>
    )
  return (
    <div className="mock-bar">
      <span className="mock-time" aria-label="Time so far">
        {mmss((end - start) / 1000)}
      </span>
      <span className="muted small">
        {done} of {set.questions.length} answered
      </span>
      <button className="btn primary small" disabled={set.status === 'writing'} onClick={() => void useNoteSets.getState().save({ ...set, finishedAt: new Date().toISOString() })}>
        Finish exam
      </button>
    </div>
  )
}

/** Contradictions between parts of the material, and lines the examiners think are wrong. */
function Findings({ set }: { set: NoteSet }) {
  const conflicts = set.conflicts ?? []
  if (!conflicts.length && !set.corrections.length) return null
  return (
    <>
      {conflicts.length > 0 && (
        <section className="corrections conflicts" aria-label="Your material disagrees with itself">
          <h3>Your material disagrees with itself</h3>
          <p className="muted small">No questions were set on these points. Check them against your lecturer or textbook.</p>
          <ul>
            {conflicts.map((c, k) => (
              <li key={k}>
                <p className="c-quote">
                  <span className="c-k">{c.refA}</span> “{c.quoteA}”
                </p>
                <p className="c-quote">
                  <span className="c-k">{c.refB}</span> “{c.quoteB}”
                </p>
                <p className="c-problem">{c.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {set.corrections.length > 0 && (
        <section className="corrections" aria-label="Check these in your notes">
          <h3>Check these in your notes</h3>
          <p className="muted small">The examiners think these lines are not right. No questions were set on them.</p>
          <ul>
            {set.corrections.map((c, k) => (
              <li key={k}>
                <p className="c-quote">
                  <span className="c-k">{c.ref ? `You wrote (${c.ref})` : 'You wrote'}</span> “{c.quote}”
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
    </>
  )
}

/** Flashcards written for the set: they are in My cards; study them there. */
function FlashcardList({ set }: { set: NoteSet }) {
  const live = useMyCards((s) => s.cards)
  const cards = set.cards ?? []
  if (!cards.length) return set.status === 'writing' ? null : <p className="muted">No cards were written.</p>
  return (
    <section className="set-cards" aria-label="Flashcards">
      <button className="btn primary wide" onClick={() => useSession.getState().open('mycards')}>
        <CardsIcon /> Study my cards
      </button>
      <p className="muted small">These cards are in My cards, scheduled for spaced review with your other cards.</p>
      <ol className="card-list">
        {cards.map((c) => (
          <li key={c.id} className={live[c.id]?.deletedAt ? 'deleted' : ''}>
            <p className="card-front">{c.front}</p>
            <p className="card-back">{c.back}</p>
            <p className="muted small">From your notes: {c.ref}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Coverage by topic: how much of the material is tested, gaps, accuracy, and weak spots to practise. */
function Coverage({ set }: { set: NoteSet }) {
  const answers = useExam((s) => s.answers)
  const docs = useNoteDocs((s) => s.docs)
  const [busy, setBusy] = useState<'idle' | 'busy' | { error: string }>('idle')
  if (!set.parts?.length) return null
  const rows = topicCoverage(set, answers)
  const missed = missedIn(set, answers)
  const texts = new Map(docs.flatMap((d) => d.parts.map((p) => [p.id, p] as const)))
  const weakParts = (set.parts ?? []).filter((p) => missed.refs.includes(p.ref) && texts.get(p.partId))

  const practise = async () => {
    setBusy('busy')
    try {
      const parts = weakParts.map((p) => {
        const part = texts.get(p.partId)!
        return { ...p, text: [part.title, part.text, part.notes ? `Speaker notes: ${part.notes}` : ''].filter(Boolean).join('\n') }
      })
      const newId = await startSet({ settings: { ...set.settings, mode: 'weak', count: missed.stems.length > 5 ? 10 : 5 }, module: set.module, parts, files: set.from.files ?? [], focus: missed.stems.slice(0, 30) })
      useNav.getState().push({ kind: 'noteset', id: newId })
      setBusy('idle')
    } catch (e) {
      setBusy({ error: e instanceof NotesError ? e.message : 'The weak-spots set could not be started.' })
    }
  }

  return (
    <section className="coverage" aria-label="Coverage">
      <h3>Coverage</h3>
      <table className="coverage-table">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">Parts tested</th>
            <th scope="col">Right</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.topic} className={r.accuracy !== null && r.accuracy < 0.6 ? 'weak' : ''}>
              <th scope="row">{r.topic}</th>
              <td>
                {r.tested} of {r.parts}
              </td>
              <td>{r.accuracy === null ? '—' : `${Math.round(r.accuracy * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((r) => r.gaps.length) && (
        <p className="muted small">
          Gaps (no questions yet):{' '}
          {rows
            .flatMap((r) => r.gaps.map((g) => g.ref))
            .slice(0, 8)
            .join('; ')}
          {rows.reduce((n, r) => n + r.gaps.length, 0) > 8 ? '…' : ''}
        </p>
      )}
      {missed.stems.length > 0 && (
        <>
          <button className="btn ghost" disabled={!apiReady() || !weakParts.length || busy === 'busy'} onClick={() => void practise()}>
            {busy === 'busy' ? 'Starting…' : `Practise my weak spots (${plural(missed.stems.length, 'question')} missed)`}
          </button>
          {!weakParts.length && <p className="muted small">The material for these questions is no longer on this device, so weak-spot questions cannot be written from it.</p>}
          {typeof busy === 'object' && (
            <p className="field-error" role="alert">
              {busy.error}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function DeleteSet({ set, onClose }: { set: NoteSet; onClose: () => void }) {
  const toast = useToast((s) => s.show)
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <aside className="sheet" role="dialog" aria-modal aria-label="Delete this set?" onClick={(e) => e.stopPropagation()}>
          <h2>Delete this set?</h2>
          <p className="muted">
            “{set.title}”, its answers, and any highlights and notes you made on it are removed from this device.
            {set.cards?.length ? ' Its flashcards stay in My cards.' : ''}
          </p>
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
