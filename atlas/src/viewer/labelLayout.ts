/**
 * Label placement: two columns at the screen edges, never hiding a label.
 *
 * - A label's column is chosen by which half of the screen its anchor is in, with hysteresis (it only switches
 *   when the anchor is clearly past the centre), so labels don't flip back and forth while the model turns.
 * - Within a column, labels keep the vertical order of their anchors and are pushed apart to at least one row
 *   height; if they don't fit, the rows tighten down to `minRow`, and beyond that the column splits into
 *   sub-columns (interleaved, so neighbours alternate). Nothing is dropped.
 */
export interface LabelInput {
  id: string
  ax: number // anchor, screen px (may be off screen)
  ay: number
  width: number // label text width, px
  prevSide?: 'left' | 'right'
  /** Column already decided (by groupOverflow's balancing): placement keeps it. */
  side?: 'left' | 'right'
}
export interface LabelPlacement {
  id: string
  side: 'left' | 'right'
  x: number // left column: label's left edge; right column: label's right edge
  y: number // label centre line
}
export interface LayoutBox {
  width: number
  top: number // first usable y (px)
  bottom: number // last usable y (px)
  row: number // preferred row height
  minRow: number
  edge: number // margin from the screen edge
  gap: number // gap between sub-columns
  hysteresis: number // fraction of the width past the centre needed to switch columns
}

export function placeLabels(items: LabelInput[], box: LayoutBox): LabelPlacement[] {
  const mid = box.width / 2
  const band = box.width * box.hysteresis
  const sides: Record<'left' | 'right', LabelInput[]> = { left: [], right: [] }
  for (const it of items) {
    let side: 'left' | 'right'
    if (it.side) side = it.side
    else if (it.prevSide === 'left') side = it.ax < mid + band ? 'left' : 'right'
    else if (it.prevSide === 'right') side = it.ax > mid - band ? 'right' : 'left'
    else side = it.ax < mid ? 'left' : 'right'
    sides[side].push(it)
  }
  const out: LabelPlacement[] = []
  const avail = Math.max(box.bottom - box.top, box.minRow)
  for (const side of ['left', 'right'] as const) {
    const col = sides[side].sort((a, b) => a.ay - b.ay || a.id.localeCompare(b.id))
    if (!col.length) continue
    const row = Math.max(box.minRow, Math.min(box.row, avail / col.length))
    const perSub = Math.max(1, Math.floor(avail / row + 1e-6)) // an exact fit is a fit (floating-point)
    const subs = Math.ceil(col.length / perSub)
    // Sub-column j holds every subs-th label (interleaved by height).
    const groups: LabelInput[][] = Array.from({ length: subs }, () => [])
    col.forEach((it, i) => groups[i % subs].push(it))
    let offset = 0
    groups.forEach((g) => {
      const ys = spread(
        g.map((it) => it.ay),
        row,
        box.top + row / 2,
        box.bottom - row / 2,
      )
      g.forEach((it, i) => out.push({ id: it.id, side, x: side === 'left' ? box.edge + offset : box.width - box.edge - offset, y: ys[i] }))
      offset += Math.max(...g.map((it) => it.width)) + box.gap
    })
  }
  return out
}

/** Positions as close to `want` (sorted) as possible, at least `row` apart, within [lo, hi]. */
export function spread(want: number[], row: number, lo: number, hi: number): number[] {
  const n = want.length
  const y = want.map((v) => Math.min(hi, Math.max(lo, v)))
  for (let i = 1; i < n; i++) y[i] = Math.max(y[i], y[i - 1] + row)
  if (n && y[n - 1] > hi) {
    y[n - 1] = hi
    for (let i = n - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] - row)
  }
  // If it still overflows at the top (more labels than fit), spread evenly over the whole range.
  if (n && y[0] < lo - 0.5) {
    const step = n > 1 ? (hi - lo) / (n - 1) : 0
    for (let i = 0; i < n; i++) y[i] = lo + step * i
  }
  return y
}

/** Rows that fit in one column without overlapping (no sub-columns). */
export const columnCapacity = (box: LayoutBox) => Math.max(1, Math.floor((box.bottom - box.top) / box.minRow))

export interface Groupable extends LabelInput {
  cluster: string // e.g. "Hand|Phalanges of the hand|left"
  clusterLabel: string // e.g. "Phalanges of the hand"
  region?: string // coarser fallback, e.g. "R|Hand|left"
  regionLabel?: string // e.g. "Hand"
  keep?: boolean // never grouped (the selected bone)
}
export interface LabelGroup {
  id: string // "group:<side>:<cluster or region key>"
  text: string
  members: string[]
}

/**
 * When a column has more labels than fit, replaces whole clusters by one group label each ("Phalanges of the
 * hand (14)"), largest first, until the column fits. If that is not enough (clusters split between the columns,
 * one bone each), the column regroups by region instead ("Hand (27)"). Every bone stays covered: by its own label
 * or its group's. Group labels are anchored at the mean of their members' anchors. An overfull column first hands
 * the labels nearest the centre to the other column, if it has room.
 */
export function groupOverflow(items: Groupable[], box: LayoutBox, canGroup: (groupId: string) => boolean = () => true): { items: LabelInput[]; groups: LabelGroup[] } {
  const cap = columnCapacity(box)
  const mid = box.width / 2
  const band = box.width * box.hysteresis
  const sideOf = (it: LabelInput) =>
    it.prevSide === 'left' ? (it.ax < mid + band ? 'left' : 'right') : it.prevSide === 'right' ? (it.ax > mid - band ? 'right' : 'left') : it.ax < mid ? 'left' : 'right'
  const sides = { left: items.filter((it) => sideOf(it) === 'left'), right: items.filter((it) => sideOf(it) === 'right') }
  for (const [from, to] of [['left', 'right'], ['right', 'left']] as const) {
    if (sides[from].length <= cap || sides[to].length >= cap) continue
    sides[from].sort((a, b) => (from === 'left' ? b.ax - a.ax : a.ax - b.ax)) // nearest the centre first
    while (sides[from].length > cap && sides[to].length < cap) sides[to].push({ ...sides[from].shift()!, prevSide: to })
  }
  const out: LabelInput[] = []
  const groups: LabelGroup[] = []
  for (const side of ['left', 'right'] as const) {
    const col = sides[side].map((it) => ({ ...it, prevSide: side, side }))
    let res = groupColumn(col, side, cap, (it) => [it.cluster, it.clusterLabel], canGroup)
    if (res.items.length > cap) res = groupColumn(col, side, cap, (it) => [it.region ?? it.cluster, it.regionLabel ?? it.clusterLabel], canGroup)
    out.push(...res.items)
    groups.push(...res.groups)
  }
  return { items: out, groups }
}

function groupColumn(
  col: Groupable[],
  side: 'left' | 'right',
  cap: number,
  keyOf: (it: Groupable) => [string, string],
  canGroup: (groupId: string) => boolean,
): { items: LabelInput[]; groups: LabelGroup[] } {
  let rest: Groupable[] = col
  const made: LabelInput[] = []
  const groups: LabelGroup[] = []
  const tried = new Set<string>()
  while (rest.length + made.length > cap) {
    const counts = new Map<string, number>()
    for (const it of rest) if (!it.keep && !tried.has(keyOf(it)[0])) counts.set(keyOf(it)[0], (counts.get(keyOf(it)[0]) ?? 0) + 1)
    const [key, n] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? []
    if (!key || n! < 2) break
    tried.add(key)
    const id = `group:${side}:${key}`
    if (!canGroup(id)) continue
    const members = rest.filter((it) => keyOf(it)[0] === key && !it.keep)
    rest = rest.filter((it) => !members.includes(it))
    const g: LabelGroup = { id, text: `${keyOf(members[0])[1]} (${members.length})`, members: members.map((m) => m.id) }
    groups.push(g)
    made.push({
      id,
      side,
      prevSide: side,
      ax: members.reduce((s, m) => s + m.ax, 0) / members.length,
      ay: members.reduce((s, m) => s + m.ay, 0) / members.length,
      width: 0, // the caller sets the group label's width
    })
  }
  return { items: [...rest, ...made], groups }
}
