import { useEffect, useRef } from 'react'
import type { QuizMode } from '../state/settings'
import type { Outcome } from '../lib/srs'

interface Props {
  answer: string
  typed: string
  mode: QuizMode
  done: boolean
  outcome: Outcome | null
  /** Increments on every wrong key, to replay the shake. */
  wrongCount: number
}

/** The large serif answer word: ghost letters (learn) or dashes (hard), filled in as you type. */
export function AnswerWord({ answer, typed, mode, done, outcome, wrongCount }: Props) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wrongCount) return
    el.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(2px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: 'ease-out' },
    )
  }, [wrongCount])

  const size = Math.max(24, Math.min(46, 620 / Math.max(answer.length, 1)))
  const state = done ? (outcome === 'failed' ? 'fail' : 'ok') : 'typing'

  return (
    <div
      ref={el}
      className={`answer answer-${state}`}
      dir="ltr"
      style={{ fontSize: size }}
      aria-label={done ? answer : `${typed.length} of ${answer.length} letters typed`}
      aria-live="polite"
    >
      {[...answer].map((ch, i) => {
        const isTyped = i < typed.length
        const caret = !done && i === typed.length
        if (ch === ' ') return <span key={i} className={`answer-space${caret ? ' caret' : ''}`} />
        return (
          <span
            key={i}
            className={`answer-ch ${isTyped || done ? 'typed' : mode === 'hard' ? 'dash' : 'ghost'}${caret ? ' caret' : ''}`}
          >
            {ch}
          </span>
        )
      })}
      {!done && typed.length >= answer.length && <span className="answer-ch caret caret-end" />}
    </div>
  )
}
