// Repairs the skin's eyelids in the male layered model (public/models/tissue/layers-male*.glb), in place.
//
// Fitting the MakeHuman skin to the Atlas skull crumples the eyelids round each eye's opening, and they fold across
// the front of the eyeball; the opening itself is a small circle off the cornea's centre. This reshapes each opening
// into an almond centred on the cornea (white of the eye either side of the iris, the lids just covering its top and
// bottom, the outer corner a little higher), refills the lids as a smooth surface spanning the skin around them,
// lying on the eyeball and blending into the skin without an edge, and recomputes their normals. Nothing else in the
// file changes.
//   node scripts/model/fix_eyelids.mjs public/models/tissue/layers-male.glb public/models/tissue/layers-male-phone.glb
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})

const R_FULL = 0.016 // m, around the eye's axis: smoothed fully within this distance
const R_EDGE = 0.024 // m: and not at all beyond this one
const CLEAR = 0.001 // m: the lids' least distance in front of the sclera
const SOFT = 0.005 // m: how gently the eye's bulge blends into the lids
const WIDEN = 2.3 // the opening's width, as a multiple of the source's
const NARROW = 0.9 // and its height
const TILT = 0.08 // the outer corner's rise, per unit of sideways distance

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file)
  const mesh = (n) => doc.getRoot().listMeshes().find((m) => m.getName() === n)
  const prim = mesh('skin').listPrimitives()[0]
  const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), I = prim.getIndices().getArray()
  const n = P.getCount()
  const pos = Array.from({ length: n }, (_, i) => P.getElement(i, []))
  const nrm = Array.from({ length: n }, (_, i) => N.getElement(i, []))
  // Vertices split at UV seams share a position: weld them so the smoothing sees one surface.
  const key = (p) => p.map((x) => Math.round(x * 1e5)).join(',')
  const ids = new Map(), w = pos.map((p) => { const k = key(p); if (!ids.has(k)) ids.set(k, ids.size); return ids.get(k) })
  const W = ids.size, wp = new Array(W), wn = Array.from({ length: W }, () => [0, 0, 0])
  pos.forEach((p, i) => { wp[w[i]] = [...p]; for (let k = 0; k < 3; k++) wn[w[i]][k] += nrm[i][k] })
  const nb = Array.from({ length: W }, () => new Set())
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = w[I[t + e]], b = w[I[t + (e + 1) % 3]]; if (a !== b) { nb[a].add(b); nb[b].add(a) } }
  let moved = 0
  for (const side of ['left', 'right']) {
    const s = mesh(`sclera_${side}`).listPrimitives()[0].getAttribute('POSITION')
    const box = (a) => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], v = []; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]) } } return [mn, mx] }
    const [smn, smx] = box(s)
    const O = smn.map((v, k) => (v + smx[k]) / 2) // the eyeball's centre
    const RS = (smx[2] - smn[2]) / 2 // and the sclera's radius
    const [cmn, cmx] = box(mesh(`cornea_${side}`).listPrimitives()[0].getAttribute('POSITION'))
    const C = [(cmn[0] + cmx[0]) / 2, (cmn[1] + cmx[1]) / 2] // the cornea's centre, seen from the front
    const out = side === 'left' ? 1 : -1 // the lateral direction (+x is the body's left)
    // The lids: every point in front of the eyeball's centre and near its axis, however folded. They are refilled as a
    // smooth membrane spanning the skin around them (which stays fixed), blending into it over the outer ring.
    const weight = new Map()
    for (let i = 0; i < W; i++) {
      const p = wp[i], d = Math.hypot(p[0] - O[0], p[1] - O[1])
      if (d < R_EDGE && p[2] > O[2] + 0.002) weight.set(i, d < R_FULL ? 1 : (R_EDGE - d) / (R_EDGE - R_FULL))
    }
    for (let it = 0; it < 300; it++) {
      const next = new Map()
      for (const [i, wt] of weight) {
        const m = [0, 0, 0]; let k = 0
        for (const j of nb[i]) { if (wp[j][2] < O[2]) continue; for (let a = 0; a < 3; a++) m[a] += wp[j][a]; k++ }
        if (!k) continue
        next.set(i, wp[i].map((v, a) => v + 0.6 * wt * (m[a] / k - v)))
      }
      for (const [i, p] of next) wp[i] = p
    }
    // Where the opening is: the centre of the points, seen from the front, that no lid covers.
    const lid = []
    for (let t = 0; t < I.length; t += 3) {
      const v = [w[I[t]], w[I[t + 1]], w[I[t + 2]]]
      if (v.every((i) => weight.has(i))) lid.push(v.map((i) => wp[i]))
    }
    const covered = (x, y) => lid.some(([a, b, c]) => {
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d
      return l1 >= 0 && l2 >= 0 && l1 + l2 <= 1
    })
    const open = [0, 0]; let k = 0
    for (let x = -0.01; x <= 0.01; x += 0.0004)
      for (let y = -0.01; y <= 0.01; y += 0.0004)
        if (!covered(C[0] + x, C[1] + y)) { open[0] += C[0] + x; open[1] += C[1] + y; k++ }
    const H = k ? [open[0] / k, open[1] / k] : C
    // The opening becomes an almond centred on the cornea: the lids are stretched sideways about the opening's centre
    // and drawn together a little, most at the opening and not at all at the edge of the region, and the opening is
    // moved onto the cornea; the outer corner rises slightly.
    for (const [i, wt] of weight) {
      const p = wp[i], dx = p[0] - H[0], dy = p[1] - H[1], d = Math.hypot(dx, dy)
      const f = wt * Math.max(0, 1 - d / R_FULL) ** 0.7
      const x = dx * (1 + (WIDEN - 1) * f), y = dy * (1 + (NARROW - 1) * f)
      p[0] = H[0] + x + (C[0] - H[0]) * f
      p[1] = H[1] + y + (C[1] - H[1]) * f + TILT * out * x * f
    }
    if (process.env.VERBOSE) console.log(side, 'opening centre to cornea (mm):', ((C[0] - H[0]) * 1000).toFixed(1), ((C[1] - H[1]) * 1000).toFixed(1))
    // The lids lie on the eyeball: their depth is a smooth maximum of the refilled surface and the sclera (plus CLEAR),
    // so the bulge of the eye blends into the skin without an edge; the cornea stands proud in the opening.
    const R = RS + CLEAR
    const smax = (a, b, k) => (a + b + Math.sqrt((a - b) ** 2 + k * k)) / 2
    for (const [i, wt] of weight) {
      const p = wp[i], d = Math.hypot(p[0] - O[0], p[1] - O[1])
      const eye = d < R ? O[2] + Math.sqrt(R * R - d * d) : O[2]
      p[2] = p[2] + wt * (smax(p[2], eye, SOFT) - p[2])
      moved++
    }
  }
  // Normals: recomputed from the triangles (area-weighted), on the welded surface so seams stay smooth.
  const fn = Array.from({ length: W }, () => [0, 0, 0])
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [w[I[t]], w[I[t + 1]], w[I[t + 2]]]
    const u = wp[b].map((v, k) => v - wp[a][k]), v = wp[c].map((x, k) => x - wp[a][k])
    const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    for (const x of [a, b, c]) for (let k = 0; k < 3; k++) fn[x][k] += cr[k]
  }
  for (let i = 0; i < n; i++) {
    P.setElement(i, wp[w[i]])
    const f = fn[w[i]], l = Math.hypot(...f) || 1
    N.setElement(i, f.map((x) => x / l))
  }
  await doc.transform(draco({ quantizePosition: 14, quantizeNormal: 10 }))
  await io.write(file, doc)
  console.log(file, `${moved} eyelid vertices smoothed`)
}
