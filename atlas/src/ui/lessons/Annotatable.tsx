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
/** The note popover: reading a note, or writing it. Positions are relative to the popover's positioned parent. */
export interface Pop {
  id: string
  mode: 'view' | 'edit'
  at: Box
  width: number
}

const COLOR_LABEL: Record<HighlightColor, string> = { yellow: 'Yellow', teal: 'Teal', pink: 'Pink', blue: 'Blue' }
const WORD = /[\p{L}\p{N}'’]/u
const PIN = 26 // pin touch target, px
const coarse = () => window.matchMedia?.('(pointer: coarse)').matches ?? false
const hasNote = (a: Annotation) => a.note.trim().length > 0
const bounds = (boxes: Box[]): Box => {
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  return { x: x0, y: y0, w: Math.max(...boxes.map((b) => b.x + b.w)) - x0, h: Math.max(...boxes.map((b) => b.y + b.h)) - y0 }
}

/**
 * Highlights and notes on text. Wraps content whose paragraphs carry `data-pid` (stable ids).
 *
 * Select text (long-press or drag): a toolbar offers four colours, Note and Copy. Tap a highlight to recolour it,
 * add a note, copy or delete it. A note is never a block in the text: a small pin sits in the margin beside its line
 * (the text gets a dotted underline); tap the pin to read it, edit or delete it. Notes save on every keystroke.
 *
 * Everything is drawn around the content (bands behind the text, pins in the margin), never inside it, and anchored to
 * the paragraph id and the quoted text so it survives small changes to the text. Saved the moment it is made.
 */
export function Annotatable({ doc, docLabel, children, className }: { doc: string; docLabel: string; children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const items = useAnnotations((s) => s.items)
  const live = useMemo(() => liveFor(items, doc).filter((a) => a.segs.length), [items, doc])
  const [drawn, setDrawn] = useState<Drawn[]>([])
  const [bar, setBar] = useState<Bar | null>(null)
  const [pop, setPop] = useState<Pop | null>(null)
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
          // Merge pieces on the same line (inline links split the text into several rects).
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

  // Re-draw when anything moves the text: text size, images loading, rotation, fonts, sections opening.
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

  /** Margin pins, one per note, beside the first line it is attached to; pins on the same line stack downward. */
  const pins = useMemo(() => {
    const list = drawn
      .filter((d) => hasNote(d.a) || pop?.id === d.a.id)
      .map((d) => ({ a: d.a, y: d.boxes[0].y + d.boxes[0].h / 2 - PIN / 2 }))
      .sort((p, q) => p.y - q.y)
    for (let k = 1; k < list.length; k++) if (list[k].y < list[k - 1].y + PIN) list[k].y = list[k - 1].y + PIN
    return list
  }, [drawn, pop])

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

  // A tap on a highlight edits it; a tap on noted text opens the note. Bone names and figure links keep their own taps.
  const onClick = (e: React.MouseEvent) => {
    if (!window.getSelection()?.isCollapsed) return
    if ((e.target as HTMLElement).closest('button, a, textarea, [role="button"], .annot-bar, .note-pop')) return
    const base = root.current!.getBoundingClientRect()
    const x = e.clientX - base.left
    const y = e.clientY - base.top
    for (let k = drawn.length - 1; k >= 0; k--) {
      const { a, boxes } = drawn[k]
      if (!boxes.some((b) => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2)) continue
      if (!a.color && a.scope === 'para') continue // a paragraph note is opened from its pin
      haptic('light')
      if (a.color) setBar({ kind: 'edit', id: a.id, at: bounds(boxes), width: base.width })
      else setPop({ id: a.id, mode: 'view', at: bounds(boxes), width: base.width })
      return
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
    } else useAnnotations.getState().update(bar.id, { color })
    setBar(null)
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
  /** Delete a highlight. If it carries a note, the note stays (on the same words, without the colour). */
  const del = () => {
    if (bar?.kind !== 'edit') return
    haptic('medium')
    const a = items[bar.id]
    if (a && hasNote(a)) {
      useAnnotations.getState().update(bar.id, { color: null })
      toast('Highlight removed. Your note is kept.')
    } else useAnnotations.getState().remove(bar.id)
    setBar(null)
  }
  /** Note from the toolbar: on a fresh selection (a new note), or on the tapped highlight. */
  const note = () => {
    if (!bar) return
    haptic('light')
    if (bar.kind === 'new') {
      const a = useAnnotations.getState().add({ doc, docLabel, segs: bar.segs, color: null, note: '', scope: 'text' })
      setPop({ id: a.id, mode: 'edit', at: bar.at, width: bar.width })
      clearSelection()
    } else {
      const a = items[bar.id]
      setPop({ id: bar.id, mode: a && hasNote(a) ? 'view' : 'edit', at: bar.at, width: bar.width })
    }
    setBar(null)
  }
  /** Close the note popover; a note left empty is not kept (a highlight stays a highlight). */
  const closePop = () => {
    if (!pop) return
    const a = useAnnotations.getState().items[pop.id]
    if (a && !a.deletedAt && !hasNote(a)) {
      if (a.color) useAnnotations.getState().update(a.id, { note: '' })
      else useAnnotations.getState().remove(a.id)
    }
    setPop(null)
  }

  const current = bar?.kind === 'edit' ? items[bar.id] : null
  // Below the selection on touch screens (the phone's own menu sits above it), above it with a mouse.
  const below = coarse()
  const barStyle = bar
    ? {
        left: Math.max(170, Math.min(bar.at.x + bar.at.w / 2, bar.width - 170)),
        top: below || bar.at.y < 60 ? bar.at.y + bar.at.h + 10 : bar.at.y - 10,
        transform: `translate(-50%, ${below || bar.at.y < 60 ? '0' : '-100%'})`,
      }
    : undefined

  return (
    <div ref={root} className={`annot-root ${className ?? ''}`} onClick={onClick}>
      <div className="annot-layer" aria-hidden>
        {drawn.map(({ a, boxes }) =>
          boxes.map((b, k) => (
            <span
              key={`${a.id}-${k}`}
              className={[
                'hl',
                a.color ? `hl-${a.color}` : 'hl-none',
                hasNote(a) && a.scope !== 'para' ? 'noted' : '',
                (bar?.kind === 'edit' && bar.id === a.id) || pop?.id === a.id ? 'active' : '',
              ].join(' ')}
              style={{ left: b.x - 1, top: b.y, width: b.w + 2, height: b.h }}
            />
          )),
        )}
      </div>
      {children}
      <div className="annot-pins">
        {pins.map(({ a, y }) => (
          <button
            key={a.id}
            className={`note-pin ${pop?.id === a.id ? 'on' : ''}`}
            style={{ top: y }}
            aria-label={`Note: ${a.note.slice(0, 60) || 'empty'}`}
            onClick={(e) => {
              e.stopPropagation()
              haptic('light')
              const base = root.current!.getBoundingClientRect()
              setBar(null)
              if (pop?.id === a.id) closePop()
              else setPop({ id: a.id, mode: 'view', at: { x: base.width - 280, y, w: 280, h: PIN }, width: base.width })
            }}
          >
            <NoteGlyph />
          </button>
        ))}
      </div>
      {bar && (
        <div className="annot-bar" role="toolbar" aria-label={bar.kind === 'new' ? 'Highlight or note' : 'Edit highlight'} style={barStyle} onPointerDown={(e) => e.preventDefault()}>
          {COLORS.map((c) => (
            <button key={c} className={`swatch hl-${c} ${current?.color === c ? 'on' : ''}`} aria-label={`${COLOR_LABEL[c]} highlight`} aria-pressed={current?.color === c} onClick={() => pick(c)} />
          ))}
          <span className="annot-sep" aria-hidden />
          <button className={`annot-btn ${current && hasNote(current) ? 'has-note' : ''}`} onClick={note} aria-label={current && hasNote(current) ? 'Open note' : 'Add a note'}>
            Note
          </button>
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
      {pop && items[pop.id] && !items[pop.id].deletedAt && (
        <NotePopover
          a={items[pop.id]}
          pop={pop}
          onMode={(mode) => setPop({ ...pop, mode })}
          onClose={closePop}
          onDelete={() => {
            haptic('medium')
            const a = items[pop.id]
            if (a.color) useAnnotations.getState().update(a.id, { note: '' })
            else useAnnotations.getState().remove(a.id)
            setPop(null)
          }}
        />
      )}
    </div>
  )
}

export function NoteGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M3 2.5h7.5L13 5v8.5H3z" fill="currentColor" opacity="0.18" />
      <path d="M3 2.5h7.5L13 5v8.5H3zM10.5 2.5V5H13M5.5 7.5h5M5.5 10h3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** A note, right beside its text: read it, edit it (saved on every keystroke) or delete it. */
export function NotePopover({ a, pop, onMode, onClose, onDelete }: { a: Annotation; pop: Pop; onMode: (m: 'view' | 'edit') => void; onClose: () => void; onDelete: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const quote = a.segs.map((s) => s.quote).join(' … ')
  const width = Math.min(300, pop.width)
  const left = Math.max(0, Math.min(pop.at.x + pop.at.w / 2 - width / 2, pop.width - width))
  const top = pop.at.y + pop.at.h + 8

  // Keep it on screen (and above the phone's keyboard while writing).
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (pop.mode === 'edit') {
      const t = area.current
      t?.focus({ preventScroll: true })
      t?.setSelectionRange(t.value.length, t.value.length)
    }
  }, [pop.mode])

  // Tap anywhere else closes it; so does Escape.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!box.current?.contains(t) && !t.closest('.note-pin')) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const toParagraph = () => {
    // Attach to the whole paragraph(s) the selection was in.
    const segs = [...new Set(a.segs.map((s) => s.para))].map((para) => {
      const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(para)}"]`)
      const text = el ? textOf(el) : a.segs.find((s) => s.para === para)!.quote
      return segmentFor(para, text, 0, text.length)
    })
    useAnnotations.getState().update(a.id, { segs, scope: 'para' })
    area.current?.focus({ preventScroll: true })
  }

  return (
    <div ref={box} className="note-pop" role="dialog" aria-label="Note" style={{ left, top, width }}>
      <p className="note-quote">{!a.segs.length ? 'On this question' : a.scope === 'para' ? 'On this paragraph' : `“${quote.length > 90 ? `${quote.slice(0, 88)}…` : quote}”`}</p>
      {pop.mode === 'edit' ? (
        <>
          <textarea
            ref={area}
            className="note-area"
            value={a.note}
            placeholder="Write a note…"
            rows={3}
            onChange={(e) => useAnnotations.getState().update(a.id, { note: e.target.value })}
            aria-label="Note"
          />
          <div className="note-actions">
            {a.segs.length > 0 && a.scope !== 'para' && !a.color && (
              <button className="link-btn" onPointerDown={(e) => e.preventDefault()} onClick={toParagraph}>
                Attach to the whole paragraph
              </button>
            )}
            <span className="note-saved" aria-live="polite">
              {a.note ? 'Saved' : ''}
            </span>
            <button className="btn primary small" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="note-text">{a.note}</p>
          <div className="note-actions">
            <button className="annot-btn danger" onClick={onDelete}>
              Delete
            </button>
            <button className="annot-btn" onClick={() => onMode('edit')}>
              Edit
            </button>
          </div>
        </>
      )}
    </div>
  )
}
