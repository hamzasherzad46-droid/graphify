/**
 * Anchoring a piece of text to a paragraph so it survives small edits to the text: the paragraph's stable id, the
 * exact quote, a little text either side, and the offsets as a hint. To find it again: every place the quote occurs
 * in the paragraph is scored by how well the text before and after matches, and by closeness to the old offset.
 */
export interface Segment {
  /** Stable paragraph id (data-pid). */
  para: string
  quote: string
  prefix: string
  suffix: string
  start: number
  end: number
}

const CONTEXT = 32

/** The paragraph's text, as the concatenation of its text nodes (what offsets count in). */
export function textOf(el: Node): string {
  let s = ''
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) s += (n as Text).data
  return s
}

/** Offset of (node, offset) within el's text. */
export function offsetIn(el: Node, node: Node, offset: number): number {
  if (node.nodeType !== Node.TEXT_NODE) {
    // A position between child nodes: count the text before that child.
    const r = document.createRange()
    r.setStart(el, 0)
    r.setEnd(node, offset)
    return r.toString().length
  }
  let n = 0
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (t === node) return n + offset
    n += (t as Text).data.length
  }
  return n
}

/** A DOM range for [start, end) of el's text. */
export function rangeFor(el: Node, start: number, end: number): Range | null {
  const r = document.createRange()
  let n = 0
  let started = false
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const len = (t as Text).data.length
    if (!started && start <= n + len) {
      r.setStart(t, start - n)
      started = true
    }
    if (started && end <= n + len) {
      r.setEnd(t, end - n)
      return r
    }
    n += len
  }
  return null
}

export function segmentFor(para: string, text: string, start: number, end: number): Segment {
  return { para, quote: text.slice(start, end), prefix: text.slice(Math.max(0, start - CONTEXT), start), suffix: text.slice(end, end + CONTEXT), start, end }
}

/** Longest common suffix of a and b / prefix: how well the surrounding text still matches. */
const tailMatch = (a: string, b: string) => {
  let k = 0
  while (k < a.length && k < b.length && a[a.length - 1 - k] === b[b.length - 1 - k]) k++
  return k
}
const headMatch = (a: string, b: string) => {
  let k = 0
  while (k < a.length && k < b.length && a[k] === b[k]) k++
  return k
}

/** Where the segment is in `text` now, or null if the quote is no longer there. */
export function locate(text: string, seg: Pick<Segment, 'quote' | 'prefix' | 'suffix' | 'start'>): { start: number; end: number } | null {
  if (!seg.quote) return null
  // Fast path: unchanged.
  if (text.slice(seg.start, seg.start + seg.quote.length) === seg.quote && text.slice(Math.max(0, seg.start - seg.prefix.length), seg.start) === seg.prefix)
    return { start: seg.start, end: seg.start + seg.quote.length }
  let best: { start: number; score: number } | null = null
  for (let i = text.indexOf(seg.quote); i >= 0; i = text.indexOf(seg.quote, i + 1)) {
    const before = text.slice(Math.max(0, i - seg.prefix.length), i)
    const after = text.slice(i + seg.quote.length, i + seg.quote.length + seg.suffix.length)
    const score = tailMatch(before, seg.prefix) + headMatch(after, seg.suffix) - Math.abs(i - seg.start) / 1000
    if (!best || score > best.score) best = { start: i, score }
  }
  // Whitespace may have changed: try again ignoring runs of spaces.
  if (!best) {
    const norm = (s: string) => s.replace(/\s+/g, ' ')
    const i = norm(text).indexOf(norm(seg.quote))
    if (i < 0) return null
    // Map the normalised index back to the original text.
    let o = 0
    let n = 0
    while (n < i && o < text.length) {
      if (/\s/.test(text[o])) {
        while (o + 1 < text.length && /\s/.test(text[o + 1])) o++
      }
      o++
      n++
    }
    let e = o
    let m = 0
    const q = norm(seg.quote)
    while (m < q.length && e < text.length) {
      if (/\s/.test(text[e])) while (e + 1 < text.length && /\s/.test(text[e + 1])) e++
      e++
      m++
    }
    return { start: o, end: e }
  }
  return { start: best.start, end: best.start + seg.quote.length }
}
