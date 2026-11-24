import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { FREQUENCY_LABEL, isCorrect, isDone, LEVEL_LABEL, questionsFor, TYPE_LABEL, useExam, type Frequency, type Level, type Question } from '../../learn/questions'
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
export function QuestionCard({ q, n, topicTitle, label: docLabel }: { q: Question; n: number; topicTitle: string; label?: string }) {
  const a = useExam((s) => s.answers[q.id])
  const theme = useResolvedTheme()
  const sex = useViewer((s) => s.sex)
  const [snapRef, near] = useNearScreen<HTMLDivElement>()
  const chosen = a?.choice
  const revealed = q.type === 'short' ? !!a : chosen !== undefined
  const label = docLabel ?? `Exam-style questions: ${topicTitle}, question ${n}`

  const choose = (k: number) => {
    if (revealed) return
    haptic(k === q.answer ? 'success' : 'medium')
    useExam.getState().choose(q.id, k)
  }

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
        <div className="q-options" role="group" aria-label="Answers">
          {q.options.map((o, k) => {
            const state = !revealed ? '' : k === q.answer ? 'right' : k === chosen ? 'wrong' : 'dim'
            return (
              <button key={k} className={`qc-opt ${state}`} disabled={revealed} onClick={() => choose(k)}>
                <span className="qc-letter">{LETTERS[k]}</span>
                <span>{o}</span>
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'short' && !revealed && (
        <button
          className="btn ghost wide q-show"
          onClick={() => {
            haptic('light')
            useExam.getState().reveal(q.id)
          }}
        >
          Show answer
        </button>
      )}

      {revealed && (
        <Annotatable doc={`eq:${q.id}`} docLabel={label} className="q-explain">
          {q.type !== 'short' ? (
            <p className={`q-verdict ${chosen === q.answer ? 'good' : 'bad'}`} role="status">
              {chosen === q.answer ? '✓ Correct.' : `Not quite. The answer is ${LETTERS[q.answer!]}: ${q.options![q.answer!]}.`}
            </p>
          ) : (
            <div className="q-model">
              <h3>Answer</h3>
              <p data-pid={`${q.id}-answer`}>{q.answerText}</p>
            </div>
          )}
          {q.notesQuote && (
            <figure className="q-from-notes">
              <figcaption>From your notes</figcaption>
              <blockquote>{q.notesQuote}</blockquote>
            </figure>
          )}
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
          {q.type === 'short' && (
            <div className="q-self" role="group" aria-label="How did you do?">
              <span className="muted small">How did you do?</span>
              <button className={`chip ${a?.self === 'knew' ? 'on' : ''}`} onClick={() => useExam.getState().mark(q.id, 'knew')}>
                I knew it
              </button>
              <button className={`chip ${a?.self === 'missed' ? 'on' : ''}`} onClick={() => useExam.getState().mark(q.id, 'missed')}>
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
