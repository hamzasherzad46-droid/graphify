import { create } from 'zustand'

/** DOM nodes of one label, registered by the overlay and moved every frame by LabelLayout. */
export interface LabelEls {
  box: HTMLButtonElement
  line: SVGPolylineElement
  dot: SVGCircleElement
}
export const labelDom = new Map<string, LabelEls>()

/** Which bones are labelled right now (changes only when density, selection or visibility change). */
/** Group label nodes ("All" mode): every possible cluster × column, mounted up front and hidden until used. */
export const useLabelSet = create<{ ids: string[]; selected: string | null; groupIds: string[] }>(() => ({
  ids: [],
  selected: null,
  groupIds: [],
}))

/** Members of each group label in use this frame (for taps). */
export const groupMembers = new Map<string, string[]>()

export const LABEL_FONT = '500 11.5px "Inter Variable", Inter, system-ui, sans-serif'
/** Short on-model label text: standard abbreviations for the longest names (the panel shows the full name). */
export function shortLabel(id: string, name: string): string {
  let m
  if ((m = id.match(/^vertebra_([ctl])(\d+)$/)) && !(id === 'vertebra_c1' || id === 'vertebra_c2')) return `${m[1].toUpperCase()}${m[2]}`
  if ((m = name.match(/^(Proximal|Middle|Distal) phalanx of the (.+)$/))) return `${{ Proximal: 'Prox.', Middle: 'Mid.', Distal: 'Dist.' }[m[1]]} phalanx, ${m[2]}`
  return name
}

/** Widest a label may be: just under half the screen, so the two columns can never meet. */
export const maxLabelWidth = (screenWidth: number) => Math.floor(screenWidth / 2 - 14)

/**
 * The label under a screen point, if any. Labels don't take touches themselves (so a drag that starts on one still
 * turns the model); taps are matched to them here. Returns the bone id, or for a group label its first member.
 */
export function labelAt(x: number, y: number): { id: string; group: boolean } | null {
  for (const [id, els] of labelDom) {
    if (!els.box || els.box.style.visibility === 'hidden' || !els.box.dataset.ready) continue
    const r = els.box.getBoundingClientRect()
    if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 3 && y <= r.bottom + 3) {
      if (!id.startsWith('group:')) return { id, group: false }
      const m = groupMembers.get(id)
      return m?.length ? { id: m[0], group: true } : null
    }
  }
  return null
}

let ctx: CanvasRenderingContext2D | null = null
const widths = new Map<string, number>()
// Re-measure once the web font has loaded (before that, the canvas measures a fallback font).
if (typeof document !== 'undefined' && document.fonts) void document.fonts.ready.then(() => widths.clear())
/** Label width in px (text + the 8 px of horizontal padding the CSS gives it). */
export function labelWidth(text: string) {
  let w = widths.get(text)
  if (w === undefined) {
    ctx ??= document.createElement('canvas').getContext('2d')!
    ctx.font = LABEL_FONT
    w = Math.ceil(ctx.measureText(text).width) + 8
    widths.set(text, w)
  }
  return w
}
