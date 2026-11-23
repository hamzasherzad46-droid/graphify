import { Fragment } from 'react'
import type { Inline } from '../../learn/textbook'

/** Rich text from the textbook. Bone names and landmarks are buttons that open the bone in 3D. */
export function Rich({ inl, onBone, onRef }: { inl: Inline[]; onBone?: (bone: string, text: string) => void; onRef?: (to: string) => void }) {
  return (
    <>
      {inl.map((x, k) => {
        if (typeof x === 'string') return <Fragment key={k}>{x}</Fragment>
        if ('bone' in x && x.bone && onBone) {
          const bone = x.bone
          return (
            <button key={k} type="button" className={`bone-link ${x.k === 'term' ? 'term' : ''}`} onClick={() => onBone(bone, x.t)}>
              {x.t}
            </button>
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
              <button key={k} type="button" className="ref-link" onClick={() => onRef(x.to)}>
                {x.t}
              </button>
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
