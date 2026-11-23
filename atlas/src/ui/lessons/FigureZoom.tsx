import { useEffect, useRef, useState } from 'react'
import { CloseIcon } from '../Icons'

/**
 * A figure full screen: pinch or double-tap to zoom, drag to move, tap × or the backdrop to close.
 * (The app's viewport has page zoom off, so zoom is done here with a transform.)
 */
export function FigureZoom({ src, alt, label, title, onClose }: { src: string; alt: string; label: string; title: string; onClose: () => void }) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ s: number; x: number; y: number; d: number; cx: number; cy: number } | null>(null)
  const lastTap = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const centre = () => {
    const p = [...pts.current.values()]
    const cx = p.reduce((a, b) => a + b.x, 0) / p.length
    const cy = p.reduce((a, b) => a + b.y, 0) / p.length
    const d = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0
    return { cx, cy, d }
  }
  const begin = () => {
    const c = centre()
    start.current = { ...t, ...c }
  }

  return (
    <div className="fig-zoom" role="dialog" aria-modal aria-label={`${label}: ${title}`} onClick={(e) => e.target === e.currentTarget && t.s === 1 && onClose()}>
      <header className="fig-zoom-head">
        <span>
          <strong>{label}</strong> {title}
        </span>
        <button className="icon-btn" aria-label="Close figure" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div
        className="fig-zoom-stage"
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          begin()
          const now = performance.now()
          if (pts.current.size === 1 && now - lastTap.current < 300) setT((v) => (v.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))
          lastTap.current = now
        }}
        onPointerMove={(e) => {
          if (!pts.current.has(e.pointerId) || !start.current) return
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          const c = centre()
          const st = start.current
          const s = c.d && st.d ? Math.min(6, Math.max(1, (st.s * c.d) / st.d)) : st.s
          setT({ s, x: s === 1 ? 0 : st.x + (c.cx - st.cx), y: s === 1 ? 0 : st.y + (c.cy - st.cy) })
        }}
        onPointerUp={(e) => {
          pts.current.delete(e.pointerId)
          if (pts.current.size) begin()
          else start.current = null
        }}
        onPointerCancel={(e) => {
          pts.current.delete(e.pointerId)
          start.current = null
        }}
      >
        <img src={src} alt={alt} draggable={false} style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }} />
      </div>
      <p className="fig-zoom-hint">{t.s > 1 ? 'Drag to move · double-tap to fit' : 'Pinch or double-tap to zoom'}</p>
    </div>
  )
}
