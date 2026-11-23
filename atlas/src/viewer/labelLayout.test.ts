import { describe, expect, it } from 'vitest'
import { placeLabels, spread, type LayoutBox } from './labelLayout'

const box: LayoutBox = { width: 390, top: 130, bottom: 750, row: 22, minRow: 16, edge: 10, gap: 14, hysteresis: 0.12 }
const minGap = (ys: number[]) => Math.min(...ys.slice(1).map((y, i) => y - ys[i]))

describe('label layout', () => {
  it('never drops a label, even 206 of them', () => {
    const items = Array.from({ length: 206 }, (_, i) => ({ id: `b${i}`, ax: (i * 37) % 390, ay: 130 + ((i * 53) % 620), width: 60 }))
    const out = placeLabels(items, box)
    expect(out).toHaveLength(206)
    expect(new Set(out.map((o) => o.id)).size).toBe(206)
  })
  it('keeps labels in a column apart and inside the usable band', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, ax: 100, ay: 400 + (i % 3), width: 50 }))
    const out = placeLabels(items, box)
    for (const x of new Set(out.map((o) => o.x))) {
      const ys = out.filter((o) => o.x === x).map((o) => o.y).sort((a, b) => a - b)
      if (ys.length > 1) expect(minGap(ys)).toBeGreaterThanOrEqual(15.99)
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(box.top)
      expect(Math.max(...ys)).toBeLessThanOrEqual(box.bottom)
    }
  })
  it('keeps the vertical order of the anchors', () => {
    const items = [300, 200, 500, 450].map((ay, i) => ({ id: `b${i}`, ax: 50, ay, width: 40 }))
    const ys = Object.fromEntries(placeLabels(items, box).map((o) => [o.id, o.y]))
    expect(ys.b1).toBeLessThan(ys.b0)
    expect(ys.b0).toBeLessThan(ys.b3)
    expect(ys.b3).toBeLessThan(ys.b2)
  })
  it('switches column only past the hysteresis band', () => {
    const at = (ax: number, prevSide: 'left' | 'right') => placeLabels([{ id: 'a', ax, ay: 300, width: 40, prevSide }], box)[0].side
    expect(at(210, 'left')).toBe('left') // just past the centre: stays
    expect(at(250, 'left')).toBe('right') // clearly past: moves
    expect(at(180, 'right')).toBe('right')
  })
  it('spread keeps wanted positions when there is room', () => {
    expect(spread([100, 200, 300], 20, 0, 1000)).toEqual([100, 200, 300])
    expect(minGap(spread([100, 101, 102], 20, 0, 1000))).toBe(20)
  })
})

import { groupOverflow, columnCapacity } from './labelLayout'

describe('label grouping (All at whole-body zoom)', () => {
  it('groups whole clusters only when a column overflows, and covers every bone', () => {
    const clusters = ['Hand|Phalanges|left', 'Hand|Carpals|left', 'Thorax|Ribs|left', 'Skull|Cranial|left']
    const items = Array.from({ length: 120 }, (_, i) => ({ id: `b${i}`, ax: 60, ay: 140 + (i % 60) * 10, width: 60, cluster: clusters[i % 4], clusterLabel: clusters[i % 4].split('|')[1], keep: i === 7 }))
    const { items: out, groups } = groupOverflow(items, box)
    for (const side of ['left', 'right']) expect(out.filter((o) => o.prevSide === side).length).toBeLessThanOrEqual(columnCapacity(box))
    const covered = new Set([...out.map((o) => o.id), ...groups.flatMap((g) => g.members)])
    for (const it of items) expect(covered.has(it.id), it.id).toBe(true)
    expect(out.some((o) => o.id === 'b7')).toBe(true) // the selected bone keeps its own label
  })
  it('gives a cluster split across both columns two distinct group labels', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ id: `b${i}`, ax: i % 2 ? 60 : 330, ay: 140 + (i % 100) * 6, width: 60, cluster: 'Foot|Phalanges|left', clusterLabel: 'Phalanges' }))
    const { groups } = groupOverflow(items, box)
    expect(groups).toHaveLength(2)
    expect(new Set(groups.map((g) => g.id)).size).toBe(2)
  })
  it('does nothing when everything fits', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, ax: 60, ay: 200 + i * 20, width: 60, cluster: 'x', clusterLabel: 'X' }))
    expect(groupOverflow(items, box).groups).toHaveLength(0)
  })
})

import { shortLabel } from './labelDom'
describe('short labels', () => {
  it('abbreviates the longest names only', () => {
    expect(shortLabel('vertebra_c7', 'Seventh cervical vertebra')).toBe('C7')
    expect(shortLabel('vertebra_t10', 'Tenth thoracic vertebra')).toBe('T10')
    expect(shortLabel('vertebra_c1', 'Atlas')).toBe('Atlas')
    expect(shortLabel('hand_proximal_phalanx_5_left', 'Proximal phalanx of the little finger')).toBe('Prox. phalanx, little finger')
    expect(shortLabel('femur_left', 'Femur')).toBe('Femur')
  })
})

describe('label layout edge cases found in the 360° test', () => {
  it('an exactly full column stays one column (no floating-point sub-column)', () => {
    const b = { ...box, top: 130, bottom: 130 + 16 * 29 }
    const items = Array.from({ length: 29 }, (_, i) => ({ id: `b${i}`, ax: 50, ay: 140 + i * 3, width: 60 }))
    const xs = new Set(placeLabels(items, b).map((p) => p.x))
    expect(xs.size).toBe(1)
  })
  it('balances an overfull column into the other one before grouping', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `b${i}`, ax: 20 + i, ay: 140 + i * 12, width: 60, cluster: `c${i % 5}`, clusterLabel: 'C' }))
    const { items: out, groups } = groupOverflow(items, box)
    expect(groups).toHaveLength(0)
    expect(out).toHaveLength(50)
  })
  it('keeps the members when a group label is not available', () => {
    const items = Array.from({ length: 120 }, (_, i) => ({ id: `b${i}`, ax: 60, ay: 140 + (i % 60) * 10, width: 60, cluster: `c${i % 3}`, clusterLabel: 'C' }))
    const { items: out, groups } = groupOverflow(items, box, () => false)
    expect(groups).toHaveLength(0)
    expect(out).toHaveLength(120)
  })
})

describe('balanced columns are kept by placement', () => {
  it('a label moved to the other column for room is placed there (no sub-columns)', () => {
    const b = { ...box, bottom: 130 + 16 * 20 } // 20 rows per column
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, ax: 40 + i * 4, ay: 140 + i * 10, width: 60, cluster: 'c', clusterLabel: 'C' }))
    const { items: balanced } = groupOverflow(items, b)
    const placed = placeLabels(balanced, b)
    expect(placed).toHaveLength(30)
    for (const side of ['left', 'right']) {
      const col = placed.filter((p) => p.side === side)
      expect(col.length).toBeLessThanOrEqual(20)
      expect(new Set(col.map((p) => p.x)).size).toBeLessThanOrEqual(1) // one x per column
    }
  })
})

describe('two-level grouping', () => {
  it('falls back to regions when clusters are singletons on this side', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: `b${i}`, ax: 60, ay: 140 + i * 10, width: 60, cluster: `c${i}`, clusterLabel: `C${i}`, region: `R|r${i % 4}|left`, regionLabel: `Region ${i % 4}` }))
    const b = { ...box, bottom: 130 + 16 * 20 } // 20 rows per column
    const { items: out, groups } = groupOverflow(items, b)
    for (const side of ['left', 'right']) expect(out.filter((o) => o.side === side).length).toBeLessThanOrEqual(20)
    expect(groups.some((g) => g.text.startsWith('Region'))).toBe(true)
    const covered = new Set([...out.map((o) => o.id), ...groups.flatMap((g) => g.members)])
    expect(covered.size).toBeGreaterThanOrEqual(60)
  })
})
