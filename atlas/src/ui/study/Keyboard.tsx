import { useEffect, useRef } from 'react'
import { keyClick, wrongLetter } from '../../learn/sound'
import { haptic } from '../../lib/feedback'

export type KeyName = string // 'a'–'z', ' ', 'back', 'hint', 'skip'
/** What a key press did: accepted, refused (wrong letter), a note (an everyday name: not an error), or nothing. */
export type KeyOutcome = 'ok' | 'wrong' | 'note' | 'none'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const FLASH_MS = 120

/**
 * The in-app keyboard (no system keyboard, so nothing jumps and no autocorrect). Keys respond on pointer-down
 * for low latency. Each press: a soft "thock" and a light haptic; the key lights teal for 120 ms. A refused letter
 * flashes red and shakes, with a low "tuk" and a stronger haptic. A physical keyboard works too.
 */
export function Keyboard({ onKey, disabled }: { onKey: (k: KeyName) => KeyOutcome; disabled?: boolean }) {
  const keys = useRef(new Map<string, HTMLButtonElement>())
  const timers = useRef(new Map<string, number>())
  const onKeyRef = useRef(onKey)
  const disabledRef = useRef(disabled)
  useEffect(() => {
    onKeyRef.current = onKey
    disabledRef.current = disabled
  })

  const flash = (k: string, cls: 'hit' | 'miss' | 'note') => {
    const el = keys.current.get(k)
    if (!el) return
    el.classList.remove('hit', 'miss', 'note')
    void el.offsetWidth // restart the animation
    el.classList.add(cls)
    window.clearTimeout(timers.current.get(k))
    timers.current.set(k, window.setTimeout(() => el.classList.remove(cls), cls === 'hit' ? FLASH_MS : 280))
  }

  const press = (k: KeyName) => {
    if (disabledRef.current) return
    keyClick(k === 'back' ? 'back' : 'key')
    const r = onKeyRef.current(k)
    if (r === 'wrong') {
      wrongLetter()
      haptic('medium')
      flash(k, 'miss')
    } else if (r === 'note') {
      haptic('light')
      flash(k, 'note')
    } else {
      haptic('light')
      flash(k, 'hit')
    }
  }
  const pressRef = useRef(press)
  useEffect(() => {
    pressRef.current = press
  })

  // Physical keyboard.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const k = e.key.length === 1 && /[a-z ]/i.test(e.key) ? e.key.toLowerCase() : e.key === 'Backspace' ? 'back' : null
      if (!k) return
      e.preventDefault()
      pressRef.current(k)
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [])

  useEffect(() => {
    const t = timers.current
    return () => t.forEach((id) => window.clearTimeout(id))
  }, [])

  const key = (k: KeyName, label: string, cls = '', aria?: string) => (
    <button
      key={k}
      ref={(el) => {
        if (el) keys.current.set(k, el)
        else keys.current.delete(k)
      }}
      type="button"
      className={`kb-key ${cls}`}
      aria-label={aria ?? label}
      onPointerDown={(e) => {
        e.preventDefault() // no focus ring, no delayed click
        press(k)
      }}
      onKeyDown={(e) => {
        // Keyboard users: Enter/Space on a focused key presses it.
        if (e.key === 'Enter') {
          e.preventDefault()
          press(k)
        }
      }}
    >
      {label}
    </button>
  )

  return (
    <div className={`kb ${disabled ? 'off' : ''}`} role="group" aria-label="Keyboard">
      {ROWS.map((row, i) => (
        <div className="kb-row" key={i}>
          {i === 2 && key('hint', 'Hint', 'fn', 'Hint: reveal the next letter (counts as an error)')}
          {[...row].map((c) => key(c, c.toUpperCase(), '', c.toUpperCase()))}
          {i === 2 && key('back', '⌫', 'fn', 'Backspace')}
        </div>
      ))}
      <div className="kb-row">
        {key('skip', 'Skip', 'fn wide', 'Skip this bone')}
        {key(' ', 'space', 'space', 'Space')}
      </div>
    </div>
  )
}
