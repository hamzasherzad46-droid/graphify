import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { COLORS, liveFor, useAnnotations, type Annotation, type HighlightColor } from '../../learn/annotations'
import { locate, offsetIn, rangeFor, segmentFor, textOf, type Segment } from '../../learn/anchor'
import { haptic } from '../../lib/feedback'
import { useToast } from '../toastStore'

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface Drawn {
  a: Annotation
  boxes: Box[]
}
/** The floating toolbar: for a fresh selection, or for an existing highlight that was tapped. */
type Bar = ({ kind: 'new'; segs: Segment[]; text: string } | { kind: 'edit'; id: string }) & { at: Box; width: number }

const COLOR_LABEL: Record<HighlightColor, string> = { yellow: 'Yellow', teal: 'Teal', pink: 'Pink', blue: 'Blue' }
const WORD = /[\p{L}\p{N}'’]/u
const coarse = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/**
 * Highlights on text. Wraps content whose paragraphs carry `data-pid` (stable ids). Select text (long-press or drag)
 * and a small toolbar offers four colours and Copy; tap a highlight to recolour, copy or delete it. Highlights are
 * drawn as bands behind the text (the content itself is never modified), anchored to the paragraph id and the
 * quoted text so they survive small changes to the text. Saved the moment they are made (see annotations.ts).
 */
export function Annotatable({ doc, docLabel, children, className }: { doc: string; docLabel: string; children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const items = useAnnotations((s) => s.items)
  const live = useMemo(() => liveFor(items, doc).filter((a) => a.color && a.segs.length), [items, doc])
  const [drawn, setDrawn] = useState<Drawn[]>([])
  const [bar, setBar] = useState<Bar | null>(null)
  const toast = useToast((s) => s.show)

  /* ── Drawing ─────────────────────────────────────────────────────────────────────────────────────────────── */

  const layout = useCallback(() => {
    const el = root.current
    if (!el) return
    const base = el.getBoundingClientRect()
    const out: Drawn[] = []
    for (const a of live) {
      const boxes: Box[] = []
      for (const seg of a.segs) {
        const p = el.querySelector<HTMLElement>(`[data-pid="${CSS.escape(seg.para)}"]`)
        if (!p) continue
        const at = locate(textOf(p), seg)
        const r = at && rangeFor(p, at.start, at.end)
        if (!r) continue
        for (const c of r.getClientRects()) {
          if (c.width < 1 || c.height < 1) continue
          const b = { x: c.left - base.left, y: c.top - base.top, w: c.width, h: c.height }
          // Merge pieces on the same line (inline buttons split the text into several rects).
          const prev = boxes[boxes.length - 1]
          if (prev && Math.abs(prev.y - b.y) < 2 && b.x <= prev.x + prev.w + 2) prev.w = Math.max(prev.w, b.x + b.w - prev.x)
          else boxes.push(b)
        }
      }
      if (boxes.length) out.push({ a, boxes })
    }
    setDrawn(out)
  }, [live])

  useLayoutEffect(() => {
    layout()
  }, [layout])

  // Re-draw when anything moves the text: text size, images loading, rotation, fonts.
  useEffect(() => {
    const el = root.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(layout)
    })
    ro.observe(el)
    void document.fonts?.ready.then(layout)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [layout])

  /* ── Selecting ───────────────────────────────────────────────────────────────────────────────────────────── */

  const fromSelection = useCallback((): Bar | null => {
    const el = root.current
    const sel = window.getSelection()
    if (!el || !sel || sel.isCollapsed || !sel.rangeCount) return null
    const range = sel.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return null
    const startEl = (range.startContainer.nodeType === 1 ? (range.startContainer as Element) : range.startContainer.parentElement)?.closest<HTMLElement>('[data-pid]')
    const endEl = (range.endContainer.nodeType === 1 ? (range.endContainer as Element) : range.endContainer.parentElement)?.closest<HTMLElement>('[data-pid]')
    if (!startEl || !endEl || !el.contains(startEl) || !el.contains(endEl)) return null
    const paras = [...el.querySelectorAll<HTMLElement>('[data-pid]')]
    const i0 = paras.indexOf(startEl)
    const i1 = paras.indexOf(endEl)
    if (i0 < 0 || i1 < i0) return null
    const segs: Segment[] = []
    for (let i = i0; i <= i1; i++) {
      const p = paras[i]
      // Nested paragraphs (a list inside a note) are covered by their own entry.
      if (paras.some((q, j) => j !== i && j >= i0 && j <= i1 && q.contains(p) && q !== p)) continue
      const text = textOf(p)
      let s = i === i0 ? offsetIn(p, range.startContainer, range.startOffset) : 0
      let e = i === i1 ? offsetIn(p, range.endContainer, range.endOffset) : text.length
      while (s < e && /\s/.test(text[s])) s++
      while (e > s && /\s/.test(text[e - 1])) e--
      // Whole words only: a selection that starts or ends inside a word takes the whole word.
      while (s > 0 && WORD.test(text[s - 1]) && WORD.test(text[s])) s--
      while (e < text.length && WORD.test(text[e]) && WORD.test(text[e - 1])) e++
      if (e > s) segs.push(segmentFor(p.dataset.pid!, text, s, e))
    }
    if (!segs.length) return null
    const r = range.getBoundingClientRect()
    const base = el.getBoundingClientRect()
    return { kind: 'new', segs, text: segs.map((s) => s.quote).join('\n\n'), at: { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }, width: base.width }
  }, [])

  useEffect(() => {
    let t = 0
    const onChange = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        const b = fromSelection()
        setBar((cur) => (b ? b : cur?.kind === 'new' ? null : cur))
      }, 180)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      window.clearTimeout(t)
    }
  }, [fromSelection])

  // Tap on a highlight: edit it. Taps on bone names and figure links keep doing their own thing.
  const onClick = (e: React.MouseEvent) => {
    if (!window.getSelection()?.isCollapsed) return
    if ((e.target as HTMLElement).closest('button, a, [role="button"], .annot-bar')) return
    const base = root.current!.getBoundingClientRect()
    const x = e.clientX - base.left
    const y = e.clientY - base.top
    for (let k = drawn.length - 1; k >= 0; k--) {
      const boxes = drawn[k].boxes
      const hit = boxes.find((b) => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2)
      if (hit) {
        haptic('light')
        // The toolbar goes clear of the whole highlight, not just the line that was tapped.
        const x0 = Math.min(...boxes.map((b) => b.x))
        const y0 = Math.min(...boxes.map((b) => b.y))
        const x1 = Math.max(...boxes.map((b) => b.x + b.w))
        const y1 = Math.max(...boxes.map((b) => b.y + b.h))
        setBar({ kind: 'edit', id: drawn[k].a.id, at: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, width: base.width })
        return
      }
    }
    if (bar?.kind === 'edit') setBar(null)
  }

  /* ── Actions ─────────────────────────────────────────────────────────────────────────────────────────────── */

  const clearSelection = () => window.getSelection()?.removeAllRanges()
  const pick = (color: HighlightColor) => {
    if (!bar) return
    haptic('light')
    if (bar.kind === 'new') {
      useAnnotations.getState().add({ doc, docLabel, segs: bar.segs, color, note: '' })
      clearSelection()
      setBar(null)
    } else {
      useAnnotations.getState().update(bar.id, { color })
      setBar(null)
    }
  }
  const copy = async () => {
    const text = bar?.kind === 'new' ? bar.text : bar?.kind === 'edit' ? items[bar.id]?.segs.map((s) => s.quote).join('\n\n') : ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    toast('Copied')
    clearSelection()
    setBar(null)
  }
  const del = () => {
    if (bar?.kind !== 'edit') return
    haptic('medium')
    useAnnotations.getState().remove(bar.id)
    setBar(null)
  }

  const current = bar?.kind === 'edit' ? items[bar.id] : null
  // Below the selection on touch screens (the phone's own menu sits above it), above it with a mouse.
  const below = coarse()
  const barStyle = bar
    ? {
        left: Math.max(150, Math.min(bar.at.x + bar.at.w / 2, bar.width - 150)),
        top: below || bar.at.y < 60 ? bar.at.y + bar.at.h + 10 : bar.at.y - 10,
        transform: `translate(-50%, ${below || bar.at.y < 60 ? '0' : '-100%'})`,
      }
    : undefined

  return (
    <div ref={root} className={`annot-root ${className ?? ''}`} onClick={onClick}>
      <div className="annot-layer" aria-hidden>
        {drawn.map(({ a, boxes }) =>
          boxes.map((b, k) => <span key={`${a.id}-${k}`} className={`hl hl-${a.color} ${bar?.kind === 'edit' && bar.id === a.id ? 'active' : ''}`} style={{ left: b.x - 1, top: b.y, width: b.w + 2, height: b.h }} />),
        )}
      </div>
      {children}
      {bar && (
        <div className="annot-bar" role="toolbar" aria-label={bar.kind === 'new' ? 'Highlight' : 'Edit highlight'} style={barStyle} onPointerDown={(e) => e.preventDefault()}>
          {COLORS.map((c) => (
            <button key={c} className={`swatch hl-${c} ${current?.color === c ? 'on' : ''}`} aria-label={`${COLOR_LABEL[c]} highlight`} aria-pressed={current?.color === c} onClick={() => pick(c)} />
          ))}
          <span className="annot-sep" aria-hidden />
          <button className="annot-btn" onClick={copy}>
            Copy
          </button>
          {bar.kind === 'edit' && (
            <button className="annot-btn danger" onClick={del}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
