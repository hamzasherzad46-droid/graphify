import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { checkCloze, FREQUENCY_LABEL, isCorrect, isDone, LEVEL_LABEL, questionsFor, TYPE_LABEL, useExam, type Frequency, type Level, type Question } from '../../learn/questions'
import { apiReady, markShortAnswer, NotesError } from '../../learn/notesExam'
import { scheduleAnswer } from '../../learn/notesReview'
import { useNoteDocs } from '../../learn/notesDocs'
import { useAnnotations } from '../../learn/annotations'
import { useNav } from '../../state/nav'
import { useViewer } from '../../state/store'
import { useResolvedTheme } from '../../lib/theme'
import { haptic } from '../../lib/feedback'
import { topicById } from '../../learn/topics'
import { CubeIcon } from '../Icons'
import { useJumpToQuestion } from './useJumpToQuestion'
import { Annotatable, NoteGlyph, NotePopover, type Pop } from './Annotatable'

const BoneSnapshot = lazy(() => import('../../viewer/BoneSnapshot'))
const LETTERS = 'ABCD'
const REVIEW_LABEL: Record<Question['reviewStatus'], string> = { draft: 'Draft, awaiting academic review', reviewed: 'Reviewed', ai: 'AI-written, AI-checked' }

/** A topic's exam-style questions: progress, filters, and the question cards. */
export function ExamQuestions({ topic, anchor }: { topic: string; anchor?: string }) {
  const all = useMemo(() => questionsFor(topic), [topic])
  const [freq, setFreq] = useState<Frequency | 'all'>('all')
  const [level, setLevel] = useState<Level | 'all'>('all')
  const shown = all.filter((q) => (freq === 'all' || q.frequency === freq) && (level === 'all' || q.level === level))

  useJumpToQuestion(anchor)

  if (!all.length) return <div className="empty-note">Exam-style questions for this topic are being written.</div>

  return (
    <div className="exam">
      <ExamProgress questions={all} />
      <div className="exam-filters">
        <Chips label="How often it comes up" value={freq} options={[['all', 'All'], ...(Object.entries(FREQUENCY_LABEL) as [Frequency, string][])]} onChange={setFreq} />
        <Chips label="Level" value={level} options={[['all', 'All levels'], ...(Object.entries(LEVEL_LABEL) as [Level, string][])]} onChange={setLevel} />
      </div>
      <ol className="q-list">
        {shown.map((q) => (
          <li key={q.id}>
            <QuestionCard q={q} n={all.indexOf(q) + 1} topicTitle={topicById(topic)?.title ?? topic} />
          </li>
        ))}
      </ol>
      {!shown.length && <p className="muted">No questions match these filters.</p>}
    </div>
  )
}

/** Answered and correct, with "Start again". */
export function ExamProgress({ questions }: { questions: Question[] }) {
  const answers = useExam((s) => s.answers)
  const done = questions.filter((q) => isDone(q, answers[q.id]))
  const right = done.filter((q) => isCorrect(q, answers[q.id])).length
  return (
    <div className="exam-progress">
      <div>
        <span className="num">
          {done.length}/{questions.length}
        </span>
        <span className="k">Answered</span>
      </div>
      <div>
        <span className="num">{done.length ? `${Math.round((right / done.length) * 100)}%` : '–'}</span>
        <span className="k">Correct</span>
      </div>
      {done.length > 0 && (
        <button className="link-btn" onClick={() => useExam.getState().reset(questions.map((q) => q.id))}>
          Start again
        </button>
      )}
    </div>
  )
}

export function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="chip-row" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} className={`chip ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

/** Mount a 3D view only while its card is near the screen (phones allow only a few WebGL canvases at once). */
function useNearScreen<T extends Element>() {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, near] as const
}

/**
 * One question: options (or "Show answer"), then the explanation, which can be highlighted and annotated.
 * `label` names the question in My Highlights / My Notes; it defaults to the built-in bank's wording.
 */
export function QuestionCard({ q, n, topicTitle, label: docLabel, deferReveal = false }: { q: Question; n: number; topicTitle: string; label?: string; deferReveal?: boolean }) {
  const a = useExam((s) => s.answers[q.id])
  const theme = useResolvedTheme()
  const sex = useViewer((s) => s.sex)
  const [snapRef, near] = useNearScreen<HTMLDivElement>()
  const [typed, setTyped] = useState('')
  const [marking, setMarking] = useState<'idle' | 'busy' | { error: string }>('idle')
  const chosen = a?.choice
  const answered = q.type === 'short' ? !!a : q.type === 'cloze' ? a?.text !== undefined : chosen !== undefined
  // A mock exam keeps the answers back until it is finished.
  const revealed = answered && !deferReveal
  const label = docLabel ?? `Exam-style questions: ${topicTitle}, question ${n}`
  const cloze = q.type === 'cloze' && a?.text !== undefined ? checkCloze(q, a.text) : null
  // Questions written from notes join spaced review once answered.
  const schedule = () => scheduleAnswer(q, useExam.getState().answers[q.id])

  const choose = (k: number) => {
    if (answered) return
    haptic(deferReveal ? 'light' : k === q.answer ? 'success' : 'medium')
    useExam.getState().choose(q.id, k)
    schedule()
  }
  const submitCloze = () => {
    if (!typed.trim() || answered) return
    useExam.getState().write(q.id, typed.trim())
    const v = checkCloze(q, typed)
    haptic(deferReveal ? 'light' : v === 'wrong' ? 'medium' : 'success')
    schedule()
  }
  const mark = async () => {
    if (!typed.trim()) return
    setMarking('busy')
    useExam.getState().write(q.id, typed.trim())
    try {
      const m = await markShortAnswer(q, typed.trim())
      useExam.getState().setMark(q.id, m)
      haptic(m.score === m.max ? 'success' : 'light')
      schedule()
      setMarking('idle')
    } catch (e) {
      setMarking({ error: e instanceof NotesError ? e.message : 'Your answer could not be marked just now.' })
    }
  }
  const canMark = q.type === 'short' && !!q.points?.length && apiReady()

  return (
    <article className={`q-card ${revealed ? 'revealed' : ''}`} aria-label={`Question ${n}`} data-qid={q.id}>
      <header className="q-tags">
        <span className={`tag freq-${q.frequency}`}>{FREQUENCY_LABEL[q.frequency]}</span>
        <span className="tag">{LEVEL_LABEL[q.level]}</span>
        <span className="q-type">{TYPE_LABEL[q.type]}</span>
        <QuestionNote q={q} label={label} />
      </header>
      <p className="q-stem">
        <span className="q-num">{n}.</span> {q.stem}
      </p>

      {q.type === 'label' && (
        <div className="q-snapshot" ref={snapRef} aria-label="3D model with one bone highlighted">
          {near && (
            <Suspense fallback={null}>
              <BoneSnapshot bone={q.label!} theme={theme} sex={sex} elevation={q.labelElevation} />
            </Suspense>
          )}
          <span className="q-snapshot-hint">Drag to turn</span>
        </div>
      )}

      {q.options && (
        <div className={`q-options ${q.type === 'tf' ? 'tf' : ''}`} role="group" aria-label="Answers">
          {q.options.map((o, k) => {
            const state = !answered ? '' : !revealed ? (k === chosen ? 'picked' : 'dim') : k === q.answer ? 'right' : k === chosen ? 'wrong' : 'dim'
            return (
              <button key={k} className={`qc-opt ${state}`} disabled={answered} onClick={() => choose(k)}>
                {q.type !== 'tf' && <span className="qc-letter">{LETTERS[k]}</span>}
                <span>{o}</span>
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'cloze' &&
        (answered ? (
          <p className={`q-typed ${revealed ? (cloze === 'wrong' ? 'bad' : 'good') : ''}`}>
            <span className="k">Your answer</span> {a?.text}
          </p>
        ) : (
          <form
            className="q-write"
            onSubmit={(e) => {
              e.preventDefault()
              submitCloze()
            }}
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type the missing word or words" aria-label="Your answer" autoCapitalize="off" spellCheck={false} />
            <button className="btn primary small" disabled={!typed.trim()}>
              Check
            </button>
          </form>
        ))}

      {q.type === 'short' && !answered && (
        <div className="q-write short">
          {canMark && (
            <>
              <textarea rows={4} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Write your answer, as you would in the exam." aria-label="Your answer" />
              <button className="btn primary small" disabled={!typed.trim() || marking === 'busy'} onClick={() => void mark()}>
                {marking === 'busy' ? 'Marking…' : 'Mark my answer'}
              </button>
              {typeof marking === 'object' && (
                <p className="field-error" role="alert">
                  {marking.error}
                </p>
              )}
            </>
          )}
          <button
            className={`btn ghost ${canMark ? 'small' : 'wide'} q-show`}
            onClick={() => {
              haptic('light')
              useExam.getState().reveal(q.id)
            }}
          >
            {canMark ? 'Show the answer instead' : 'Show answer'}
          </button>
        </div>
      )}
      {answered && !revealed && <p className="muted small q-held">Answer saved. You will see the answers when you finish the exam.</p>}

      {revealed && (
        <Annotatable doc={`eq:${q.id}`} docLabel={label} className="q-explain">
          {q.type === 'cloze' ? (
            <p className={`q-verdict ${cloze === 'wrong' ? 'bad' : 'good'}`} role="status">
              {cloze === 'correct' ? '✓ Correct.' : cloze === 'close' ? `✓ Nearly: check the spelling. The answer is “${q.answerText}”.` : `Not quite. The answer is “${q.answerText}”.`}
            </p>
          ) : q.type === 'tf' ? (
            <p className={`q-verdict ${chosen === q.answer ? 'good' : 'bad'}`} role="status">
              {chosen === q.answer ? `✓ Correct: ${q.options![q.answer!].toLowerCase()}.` : `Not quite: the statement is ${q.options![q.answer!].toLowerCase()}.`}
            </p>
          ) : q.type !== 'short' ? (
            <p className={`q-verdict ${chosen === q.answer ? 'good' : 'bad'}`} role="status">
              {chosen === q.answer ? '✓ Correct.' : `Not quite. The answer is ${LETTERS[q.answer!]}: ${q.options![q.answer!]}.`}
            </p>
          ) : a?.mark ? (
            <MarkResult q={q} />
          ) : (
            <div className="q-model">
              <h3>Answer</h3>
              <p data-pid={`${q.id}-answer`}>{q.answerText}</p>
            </div>
          )}
          {q.notesQuote && <FromNotes q={q} />}
          <h3>Why this is the answer</h3>
          <p data-pid={`${q.id}-why`}>{q.why}</p>
          {q.whyNot && (
            <>
              <h3>Why the others are wrong</h3>
              <ul className="q-whynot">
                {q.whyNot.map((w, k) =>
                  k === q.answer ? null : (
                    <li key={k} data-pid={`${q.id}-not-${k}`}>
                      <span className="qc-letter">{LETTERS[k]}</span> {w}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
          <div className="q-tip">
            <h3>Exam tip</h3>
            <p data-pid={`${q.id}-tip`}>{q.tip}</p>
          </div>
          {q.type === 'short' && !a?.mark && (
            <div className="q-self" role="group" aria-label="How did you do?">
              <span className="muted small">How did you do?</span>
              <button
                className={`chip ${a?.self === 'knew' ? 'on' : ''}`}
                onClick={() => {
                  useExam.getState().mark(q.id, 'knew')
                  schedule()
                }}
              >
                I knew it
              </button>
              <button
                className={`chip ${a?.self === 'missed' ? 'on' : ''}`}
                onClick={() => {
                  useExam.getState().mark(q.id, 'missed')
                  schedule()
                }}
              >
                I missed parts
              </button>
            </div>
          )}
          <div className="q-foot">
            {q.bone && (
              <button
                className="btn ghost small q-3d"
                onClick={() => {
                  haptic('light')
                  useNav.getState().showBone(q.bone, `${topicTitle} question ${n}`)
                }}
              >
                <CubeIcon /> See it in 3D
              </button>
            )}
            <p className="q-source">
              {q.source.ref}
              <span className={`review ${q.reviewStatus}`}>{REVIEW_LABEL[q.reviewStatus]}</span>
            </p>
          </div>
        </Annotatable>
      )}
    </article>
  )
}

/** “From your notes: Lecture 3, slide 12”, with the words tested; tap to open that part of the material. */
function FromNotes({ q }: { q: Question }) {
  const docId = q.refPart?.split(':')[0]
  const exists = useNoteDocs((s) => !!docId && s.docs.some((d) => d.id === docId && d.parts.some((p) => p.id === q.refPart)))
  return (
    <figure className="q-from-notes">
      <figcaption>
        From your notes{q.ref ? `: ${q.ref}` : ''}
        {exists && (
          <button className="link-btn" onClick={() => useNav.getState().push({ kind: 'notesdoc', id: docId!, anchor: q.refPart })}>
            Open
          </button>
        )}
      </figcaption>
      <blockquote>{q.notesQuote}</blockquote>
    </figure>
  )
}

/** A marked short answer: the score, each point hit or missed with the evidence, the student’s answer and a tip. */
function MarkResult({ q }: { q: Question }) {
  const a = useExam((s) => s.answers[q.id])
  const m = a?.mark
  if (!m) return null
  return (
    <div className="q-mark">
      <p className={`q-verdict ${m.score / m.max >= 0.6 ? 'good' : 'bad'}`} role="status">
        {m.score} out of {m.max} {m.max === 1 ? 'point' : 'points'}
      </p>
      <ul className="mark-points">
        {m.points.map((p, k) => (
          <li key={k} className={p.hit ? 'hit' : 'miss'}>
            <span className="mark-sign" aria-label={p.hit ? 'Point earned' : 'Point missed'}>
              {p.hit ? '✓' : '✗'}
            </span>
            <span>
              <strong>{p.point}</strong>
              {p.evidence && <span className="mark-evidence"> {p.hit ? `“${p.evidence}”` : p.evidence}</span>}
            </span>
          </li>
        ))}
      </ul>
      {m.tip && (
        <p className="mark-tip">
          <span className="k">Tip</span> {m.tip}
        </p>
      )}
      <details className="mark-yours">
        <summary>Your answer and the model answer</summary>
        <p>{a?.text}</p>
        <p data-pid={`${q.id}-answer`}>
          <span className="k">Model answer</span> {q.answerText}
        </p>
      </details>
    </div>
  )
}

/** A note on the whole question: a pin on the card, the same popover as notes in the text. */
function QuestionNote({ q, label }: { q: Question; label: string }) {
  const doc = `eq:${q.id}`
  const note = useAnnotations((s) => Object.values(s.items).find((a) => a.doc === doc && !a.segs.length && !a.deletedAt))
  const [pop, setPop] = useState<Pop | null>(null)
  const open = () => {
    haptic('light')
    if (pop) return close()
    const a = note ?? useAnnotations.getState().add({ doc, docLabel: label, segs: [], color: null, note: '' })
    setPop({ id: a.id, mode: a.note.trim() ? 'view' : 'edit', at: { x: 0, y: 0, w: 0, h: 30 }, width: 300 })
  }
  const close = () => {
    const a = pop && useAnnotations.getState().items[pop.id]
    if (a && !a.deletedAt && !a.note.trim()) useAnnotations.getState().remove(a.id)
    setPop(null)
  }
  const current = pop ? useAnnotations.getState().items[pop.id] : null
  return (
    <span className="q-note">
      <button className={`note-pin inline ${note?.note.trim() ? 'has' : ''} ${pop ? 'on' : ''}`} aria-label={note?.note.trim() ? 'Open your note on this question' : 'Add a note to this question'} onClick={open}>
        <NoteGlyph />
      </button>
      {pop && current && !current.deletedAt && (
        <NotePopover
          a={current}
          pop={pop}
          onMode={(mode) => setPop({ ...pop, mode })}
          onClose={close}
          onDelete={() => {
            useAnnotations.getState().remove(pop.id)
            setPop(null)
          }}
        />
      )}
    </span>
  )
}
