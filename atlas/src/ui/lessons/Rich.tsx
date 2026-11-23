import { Fragment, type ReactNode } from 'react'
import type { Inline } from '../../learn/textbook'

/**
 * A tappable word inside text. A span with button semantics rather than a <button>: browsers won't start a text
 * selection on a button, and students must be able to highlight across bone names.
 */
function Link({ className, onPress, children }: { className: string; onPress: () => void; children: ReactNode }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={className}
      onPointerDown={(e) => {
        // Focusable elements can't start a text selection: be unfocusable while pressed by touch or mouse (keyboard
        // users still Tab to it), so a long-press or drag that begins on a bone name selects text.
        const el = e.currentTarget
        el.removeAttribute('tabindex')
        window.addEventListener('pointerup', () => setTimeout(() => el.setAttribute('tabindex', '0'), 0), { once: true })
      }}
      onClick={() => {
        // A drag that selected text is not a tap.
        if (!window.getSelection()?.isCollapsed) return
        onPress()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress()
        }
      }}
    >
      {children}
    </span>
  )
}

/** Rich text from the textbook. Bone names and landmarks are buttons that open the bone in 3D. */
export function Rich({ inl, onBone, onRef }: { inl: Inline[]; onBone?: (bone: string, text: string) => void; onRef?: (to: string) => void }) {
  return (
    <>
      {inl.map((x, k) => {
        if (typeof x === 'string') return <Fragment key={k}>{x}</Fragment>
        if ('bone' in x && x.bone && onBone) {
          const bone = x.bone
          return (
            <Link key={k} className={`bone-link ${x.k === 'term' ? 'term' : ''}`} onPress={() => onBone(bone, x.t)}>
              {x.t}
            </Link>
          )
        }
        switch (x.k) {
          case 'term':
            return (
              <dfn key={k} className="term">
                {x.t}
              </dfn>
            )
          case 'bone':
            return <Fragment key={k}>{x.t}</Fragment>
          case 'em':
            return <em key={k}>{x.t}</em>
          case 'strong':
            return <strong key={k}>{x.t}</strong>
          case 'sup':
            return <sup key={k}>{x.t}</sup>
          case 'sub':
            return <sub key={k}>{x.t}</sub>
          case 'ref':
            return onRef ? (
              <Link key={k} className="ref-link" onPress={() => onRef(x.to)}>
                {x.t}
              </Link>
            ) : (
              <Fragment key={k}>{x.t}</Fragment>
            )
          default:
            return null
        }
      })}
    </>
  )
}
