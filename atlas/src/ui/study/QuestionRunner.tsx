import { useEffect, useMemo, useRef, useState } from 'react'
import { useViewer } from '../../state/store'
import { useProgress } from '../../state/progress'
import { checkAnswer, type Verdict } from '../../learn/answer'
import { distractors, shuffle, withSide } from '../../learn/pool'
import { click, correctTone, wrongTone } from '../../learn/sound'
import type { Item, Result } from '../../learn/session'
import { BONE_BY_ID } from '../../data/bones'
import { SessionTop } from './SessionTop'
import { mmss } from '../../learn/session'
import { useStudyInsets } from './useStudyInsets'

/**
 * Runs typing, multiple-choice and "tap the bone" questions (Typing Test, Quiz and Weak Bones).
 * timeLimit: seconds for the whole session (0 = none). perQuestion: seconds per question (0 = none).
 */
export function QuestionRunner({ title, items, timeLimit, perQuestion, onDone, onClose }: {
  title: string
  items: Item[]
  timeLimit: number
  perQuestion: number
  onDone: (results: Result[], info: { timeUp: boolean; ms: number }) => void
  onClose: () => void
}) {
  const loaded = useViewer((s) => s.loaded)
  const [i, setI] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [last, setLast] = useState<Result | null>(null)
  const [typed, setTyped] = useState('')
  // Seconds since the test and the question started, updated by a ticker.
  const [clock, setClock] = useState({ test: 0, q: 0 })
  const qStart = useRef(0)
  const testStart = useRef(0)
  const iRef = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  const item = items[i] as Item | undefined
  const options = useMemo(() => (item?.kind === 'choice' ? shuffle([item.bone.name, ...distractors(item.bone)]) : []), [item])

  useStudyInsets(item?.kind === 'type' ? 150 : 140, item?.kind === 'choice' ? 170 : last && last.verdict !== 'correct' ? 110 : 40)

  useEffect(() => {
    const t = window.setInterval(() => {
      const p = performance.now()
      setClock({ test: testStart.current ? (p - testStart.current) / 1000 : 0, q: qStart.current ? (p - qStart.current) / 1000 : 0 })
    }, 200)
    return () => window.clearInterval(t)
  }, [])

  // Each question: light the bone (or frame its region for "tap the bone").
  useEffect(() => {
    if (!item || !loaded) return
    iRef.current = i
    qStart.current = performance.now()
    if (!testStart.current) testStart.current = qStart.current
    const v = useViewer.getState()
    if (item.kind === 'tap') v.frameRegion(item.bone.id)
    else v.setHighlight({ target: [item.bone.id] })
    if (item.kind === 'type') input.current?.focus()
  }, [i, item, loaded])

  const finish = (all: Result[], timeUp: boolean) => {
    if (done.current) return
    done.current = true
    onDone(all, { timeUp, ms: performance.now() - (testStart.current || performance.now()) })
  }
  const go = (k: number) => {
    setTyped('')
    setLast(null)
    setI(k)
  }
  const next = () => {
    if (i + 1 >= items.length) finish(results, false)
    else go(i + 1)
  }

  const answer = (verdict: Verdict, given: string) => {
    if (!item || last) return
    const r: Result = { bone: item.bone, kind: item.kind, verdict, answer: given, ms: performance.now() - qStart.current }
    const all = [...results, r]
    setResults(all)
    setLast(r)
    useProgress.getState().record(item.bone.id, verdict === 'correct')
    if (verdict === 'correct') {
      correctTone()
      const at = i
      window.setTimeout(() => {
        if (iRef.current !== at) return
        if (at + 1 >= items.length) finish(all, false)
        else go(at + 1)
      }, item.kind === 'type' ? 650 : 850)
    } else wrongTone()
  }

  // Taps on the model answer "tap the bone" questions.
  useEffect(() => {
    const v = useViewer.getState()
    if (!item || item.kind !== 'tap' || last) {
      v.setOnTap(() => {})
      return
    }
    v.setOnTap((id) => {
      if (!id) return
      const ok = id === item.bone.id
      v.setHighlight({ target: [item.bone.id], wrong: ok ? [] : [id] }, false)
      answer(ok ? 'correct' : 'wrong', BONE_BY_ID.get(id) ? withSide(BONE_BY_ID.get(id)!) : id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, last])

  // Timers: the whole test, and each question.
  const remaining = timeLimit ? timeLimit - clock.test : 0
  const qElapsed = clock.q
  useEffect(() => {
    if (!loaded || done.current) return
    if (timeLimit && remaining <= 0) finish(results, true)
    else if (perQuestion && !last && item && qElapsed >= perQuestion) {
      if (item.kind === 'tap') useViewer.getState().setHighlight({ target: [item.bone.id] }, false)
      answer('wrong', '(time)')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock])

  if (!item) return null
  const showFeedback = last && last.verdict !== 'correct'

  return (
    <>
      <SessionTop
        title={title}
        index={i}
        total={items.length}
        timer={timeLimit ? mmss(remaining) : undefined}
        timerFrac={perQuestion && !last ? Math.max(0, 1 - qElapsed / perQuestion) : undefined}
        onClose={onClose}
      >
        <div className="study-prompt">
          {item.kind === 'type' && (
            <form
              className="type-row"
              onSubmit={(e) => {
                e.preventDefault()
                if (last) next()
                else if (typed.trim()) answer(checkAnswer(item.bone, typed), typed.trim())
              }}
            >
              <input
                ref={input}
                className={`type-input ${last ? last.verdict : ''}`}
                value={typed}
                onChange={(e) => {
                  if (last) return
                  setTyped(e.target.value)
                  click()
                }}
                placeholder="Type the bone’s name"
                aria-label="Bone name"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint={last ? 'next' : 'done'}
                readOnly={!!last}
              />
              <button type="submit" className="btn primary small">
                {last ? 'Next' : 'Check'}
              </button>
            </form>
          )}
          {item.kind === 'choice' && <p className="ask">Which bone is lit?</p>}
          {item.kind === 'tap' && (
            <p className="ask">
              Tap the <strong>{withSide(item.bone)}</strong>
            </p>
          )}
          <p className={`feedback ${last ? last.verdict : ''}`} role="status" aria-live="polite">
            {!last && item.kind === 'type' && (
              <button className="link-btn" onClick={() => answer('wrong', '—')}>
                I don’t know
              </button>
            )}
            {!last && item.kind === 'tap' && (
              <button
                className="link-btn"
                onClick={() => {
                  useViewer.getState().setHighlight({ target: [item.bone.id] }, false)
                  answer('wrong', '—')
                }}
              >
                Show me
              </button>
            )}
            {last?.verdict === 'correct' && 'Correct'}
            {last?.verdict === 'close' && (
              <>
                Almost — the spelling is <strong>{item.bone.name}</strong>
              </>
            )}
            {last?.verdict === 'wrong' && (
              <>
                {item.kind === 'tap' && last.answer !== '—' && last.answer !== '(time)' ? `That’s the ${last.answer}. ` : ''}
                {last.answer === '(time)' ? 'Time’s up. ' : ''}
                It’s the <strong>{withSide(item.bone)}</strong>
              </>
            )}
          </p>
        </div>
      </SessionTop>
      {item.kind === 'choice' && (
        <div className="study-bottom choices" role="group" aria-label="Answers">
          {options.map((o) => {
            const state = last ? (o === item.bone.name ? 'right' : o === last.answer ? 'chosen-wrong' : '') : ''
            return (
              <button key={o} className={`choice ${state}`} disabled={!!last} onClick={() => answer(o === item.bone.name ? 'correct' : 'wrong', o)}>
                {o}
              </button>
            )
          })}
        </div>
      )}
      {showFeedback && item.kind !== 'type' && (
        <div className={`study-bottom next-row ${item.kind === 'choice' ? 'above' : ''}`}>
          <button className="btn primary wide" onClick={next}>
            Next
          </button>
        </div>
      )}
    </>
  )
}
