import { memo, useEffect, useRef } from 'react'
import type { KeyInput } from '../lib/typing'
import type { KeyFlash } from '../state/quiz'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

interface Props {
  flash: KeyFlash | null
  onKey(input: KeyInput): void
  onSkip(): void
  awaitingEnter: boolean
  disabled?: boolean
  labels: { hint: string; skip: string; space: string }
}

/** Custom on-screen QWERTY keyboard. Keys light up when pressed; wrong keys flash red. */
export const Keyboard = memo(function Keyboard({ flash, onKey, onSkip, awaitingEnter, disabled, labels }: Props) {
  return (
    // Answers are typed in Latin letters, so the keyboard stays left-to-right in every language.
    <div className={`kb${disabled ? ' kb-disabled' : ''}`} role="group" aria-label="Keyboard" dir="ltr">
      {ROWS.map((row, r) => (
        <div className="kb-row" key={row}>
          {r === 2 && <Key id="hint" label={labels.hint} aria="Hint" wide flash={flash} onPress={() => onKey({ type: 'hint' })} />}
          {[...row].map((ch) => (
            <Key key={ch} id={ch} label={ch} flash={flash} onPress={() => onKey({ type: 'char', char: ch })} />
          ))}
          {r === 2 && <Key id="backspace" label="⌫" aria="Backspace" wide flash={flash} onPress={() => onKey({ type: 'backspace' })} />}
        </div>
      ))}
      <div className="kb-row">
        <Key id="skip" label={labels.skip} aria="Skip" wide flash={flash} onPress={onSkip} />
        <Key id=" " label={labels.space} aria="Space" space flash={flash} onPress={() => onKey({ type: 'char', char: ' ' })} />
        <Key id="enter" label="↵" aria="Enter" wide accent={awaitingEnter} flash={flash} onPress={() => onKey({ type: 'enter' })} />
      </div>
    </div>
  )
})

interface KeyProps {
  id: string
  label: string
  aria?: string
  wide?: boolean
  space?: boolean
  accent?: boolean
  flash: KeyFlash | null
  onPress(): void
}

function Key({ id, label, aria, wide, space, accent, flash, onPress }: KeyProps) {
  const el = useRef<HTMLButtonElement>(null)
  const hit = flash && flash.key === id ? flash : null

  useEffect(() => {
    if (!hit || !el.current) return
    const wrong = hit.kind === 'wrong'
    el.current.animate(
      wrong
        ? [
            { background: 'var(--danger)', color: '#fff', transform: 'scale(0.94)' },
            { background: 'var(--key)', color: 'var(--text)', transform: 'scale(1)' },
          ]
        : [{ background: 'var(--key-pressed)', transform: 'scale(0.94)' }, { background: 'var(--key)', transform: 'scale(1)' }],
      { duration: wrong ? 420 : 180, easing: 'ease-out' },
    )
  }, [hit])

  return (
    <button
      ref={el}
      type="button"
      className={`kb-key${wide ? ' kb-wide' : ''}${space ? ' kb-space' : ''}${accent ? ' kb-accent' : ''}`}
      aria-label={aria ?? label}
      // pointerdown feels instant on touch screens; preventDefault keeps focus off the button.
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onKeyDown={(e) => e.preventDefault()}
      tabIndex={-1}
    >
      {label}
    </button>
  )
}
