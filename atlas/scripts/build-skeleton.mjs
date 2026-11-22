#!/usr/bin/env node
/**
 * Builds the adult male skeleton model: one mesh per bone (206), plus non-selectable
 * context meshes (costal cartilages, intervertebral discs, teeth).
 *
 * Source: BodyParts3D 4.0 (© DBCLS, CC BY 4.0), the dataset Z-Anatomy's skeleton is built on,
 * read from the `@dagno/anatomy-model` npm package (data only, nothing executed):
 *
 *   mkdir -p /tmp/bp3d && (cd /tmp/bp3d && npm pack --ignore-scripts @dagno/anatomy-model && tar xzf *.tgz)
 *   node scripts/build-skeleton.mjs /tmp/bp3d/package/model male
 *
 * Output:
 *   public/models/skeleton-male.glb   Draco-compressed; node name = bone id from content/bones/*.json
 *   src/data/model-male.json          per-mesh centre, radius and triangle count (used by tests and the app)
 *
 * Each mesh is re-centred on its own bounding-box centre and the node carries that position, so a bone
 * can later be moved (exploded view, drag) by changing its node position only.
 *
 * Not in BodyParts3D, so generated here and flagged `approximate` in the node extras:
 *   - coccyx: a tapered loft at the apex of the sacrum
 *   - auditory ossicles (malleus, incus, stapes): simplified shapes built from ellipsoids and tubes,
 *     placed in the tympanic cavity found by ray-casting the temporal bone for the external acoustic meatus.
 *
 * Coordinates (unchanged from the source): metres, Y up, body faces +Z, body's left is +X.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [atlasDir, sex = 'male', hraFile] = process.argv.slice(2)
if (!atlasDir || (sex === 'female' && !hraFile)) {
  console.error('usage: build-skeleton.mjs <bodyparts3d-model-dir> [male | female <3d-vh-f-united.glb>]')
  process.exit(1)
}

/* ---------------- name mapping: BodyParts3D name → bone id ---------------- */

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
const ord = (w) => ORD.indexOf(w) + 1
const FINGER = { thumb: 1, index: 2, middle: 3, ring: 4, little: 5 }
const TOE = { big: 1, second: 2, third: 3, fourth: 4, little: 5 }

const SINGLE = {
  'frontal bone': 'frontal_bone',
  'occipital bone': 'occipital_bone',
  'sphenoid bone': 'sphenoid_bone',
  ethmoid: 'ethmoid_bone',
  vomer: 'vomer',
  mandible: 'mandible',
  'hyoid bone': 'hyoid_bone',
  atlas: 'vertebra_c1',
  axis: 'vertebra_c2',
  sacrum: 'sacrum',
  manubrium: 'sternum',
  'body of sternum': 'sternum',
  'xiphoid process': 'sternum',
}
const PAIRED = {
  'parietal bone': 'parietal_bone',
  'temporal bone': 'temporal_bone',
  'nasal bone': 'nasal_bone',
  'zygomatic bone': 'zygomatic_bone',
  maxilla: 'maxilla',
  'palatine bone': 'palatine_bone',
  'lacrimal bone': 'lacrimal_bone',
  'inferior nasal concha': 'inferior_nasal_concha',
  clavicle: 'clavicle',
  scapula: 'scapula',
  humerus: 'humerus',
  radius: 'radius',
  ulna: 'ulna',
  scaphoid: 'scaphoid',
  lunate: 'lunate',
  triquetral: 'triquetrum',
  pisiform: 'pisiform',
  trapezium: 'trapezium',
  trapezoid: 'trapezoid',
  capitate: 'capitate',
  hamate: 'hamate',
  'hip bone': 'hip_bone',
  femur: 'femur',
  patella: 'patella',
  tibia: 'tibia',
  fibula: 'fibula',
  talus: 'talus',
  calcaneus: 'calcaneus',
  'cuboid bone': 'cuboid',
  'medial cuneiform bone': 'medial_cuneiform',
  'intermediate cuneiform bone': 'intermediate_cuneiform',
  'lateral cuneiform bone': 'lateral_cuneiform',
}

/** → { id, kind: 'bone' | 'context' } or null to skip. */
function classify(name) {
  const n = name.toLowerCase()
  let m
  if (SINGLE[n]) return { id: SINGLE[n], kind: 'bone' }
  if ((m = n.match(/^(left|right) (.+)$/)) && PAIRED[m[2]]) return { id: `${PAIRED[m[2]]}_${m[1]}`, kind: 'bone' }
  if ((m = n.match(/^navicular bone of (left|right) foot$/))) return { id: `navicular_${m[1]}`, kind: 'bone' }
  if ((m = n.match(/^(\w+) cervical vertebra$/))) return { id: `vertebra_c${ord(m[1])}`, kind: 'bone' }
  if ((m = n.match(/^(\w+) thoracic vertebra$/))) return { id: `vertebra_t${ord(m[1])}`, kind: 'bone' }
  if ((m = n.match(/^(\w+) lumbar vertebra$/))) return { id: `vertebra_l${ord(m[1])}`, kind: 'bone' }
  if ((m = n.match(/^(left|right) (\w+) rib$/))) return { id: `rib_${ord(m[2])}_${m[1]}`, kind: 'bone' }
  if ((m = n.match(/^(left|right) (\w+) metacarpal bone$/))) return { id: `metacarpal_${ord(m[2])}_${m[1]}`, kind: 'bone' }
  if ((m = n.match(/^(left|right) (\w+) metatarsal bone$/))) return { id: `metatarsal_${ord(m[2])}_${m[1]}`, kind: 'bone' }
  if ((m = n.match(/^(proximal|middle|distal) phalanx of (left|right) (thumb|index finger|middle finger|ring finger|little finger)$/)))
    return { id: `hand_${m[1]}_phalanx_${FINGER[m[3].split(' ')[0]]}_${m[2]}`, kind: 'bone' }
  if ((m = n.match(/^(proximal|middle|distal) phalanx of (left|right) (big|second|third|fourth|little) toe$/)))
    return { id: `foot_${m[1]}_phalanx_${TOE[m[3]]}_${m[2]}`, kind: 'bone' }
  // Context: shown for a complete-looking skeleton, never selectable.
  if ((m = n.match(/^(left|right) (\w+) costal cartilage$/))) return { id: `ctx_costal_cartilage_${ord(m[2])}_${m[1]}`, kind: 'context' }
  if ((m = n.match(/^intervertebral disk(?: of (\w+) (cervical|thoracic|lumbar) vertebra| of axis)?$/)))
    return { id: `ctx_disc_${m[1] ? `${m[2][0]}${ord(m[1])}` : n.includes('axis') ? 'c2' : 'l5_s1'}`, kind: 'context' }
  if ((m = n.match(/^(left|right) (upper|lower) (?:(central|lateral|first|second) )?secondary (incisor|canine|premolar|molar) tooth$/)))
    return { id: `ctx_tooth_${m[2]}_${m[3] ? `${m[3]}_` : ''}${m[4]}_${m[1]}`, kind: 'context' }
  return null // tendons, laryngeal cartilages, gingiva, foot sesamoids (not among the 206)
}

/* ---------------- read the source ---------------- */

const atlas = JSON.parse(readFileSync(join(atlasDir, 'atlas.json'), 'utf8'))
const chunks = atlas.chunks.map((c) => gunzipSync(readFileSync(join(atlasDir, c.gzip))))
const byId = new Map() // bone id → { id, kind, parts: [{pos,nrm,idx}], sources: [] }
const seenSource = new Set()

for (const p of atlas.parts) {
  const c = classify(p.name)
  if (!c) continue
  // BodyParts3D lists a few meshes twice (e.g. the hyoid): keep the first copy.
  const key = `${p.name}|${p.bounds.flat().map((v) => v.toFixed(4)).join(',')}`
  if (seenSource.has(key)) continue
  seenSource.add(key)
  const buf = chunks[p.chunk]
  const n = p.vertexCount
  const pos = new Float32Array(buf.buffer.slice(buf.byteOffset + p.positions, buf.byteOffset + p.positions + n * 12))
  const sn = new Int16Array(buf.buffer.slice(buf.byteOffset + p.normals, buf.byteOffset + p.normals + n * 6))
  const nrm = Float32Array.from(sn, (v) => Math.max(v / 32767, -1))
  const idx = new Uint32Array(buf.buffer.slice(buf.byteOffset + p.indices, buf.byteOffset + p.indices + p.indexCount * 4))
  const entry = byId.get(c.id) ?? { id: c.id, kind: c.kind, parts: [], sources: [] }
  entry.parts.push({ pos, nrm, idx })
  entry.sources.push(`${p.id} ${p.name}`)
  byId.set(c.id, entry)
}

/* ---------------- geometry helpers ---------------- */

function merge(parts) {
  let nv = 0
  let ni = 0
  for (const p of parts) {
    nv += p.pos.length
    ni += p.idx.length
  }
  const pos = new Float32Array(nv)
  const nrm = new Float32Array(nv)
  const idx = new Uint32Array(ni)
  let ov = 0
  let oi = 0
  for (const p of parts) {
    pos.set(p.pos, ov)
    nrm.set(p.nrm, ov)
    for (let i = 0; i < p.idx.length; i++) idx[oi + i] = p.idx[i] + ov / 3
    ov += p.pos.length
    oi += p.idx.length
  }
  return { pos, nrm, idx }
}

function bounds(pos) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      if (pos[i + k] < min[k]) min[k] = pos[i + k]
      if (pos[i + k] > max[k]) max[k] = pos[i + k]
    }
  return { min, max }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a) => scale(a, 1 / (Math.hypot(...a) || 1))

/** Builder for small procedural meshes (ellipsoids, tapered tubes), merged into one geometry. */
class Shape {
  pos = []
  nrm = []
  idx = []
  /** Ellipsoid at c with radii r, axes rotated so its local y-axis points along `up`. */
  ellipsoid(c, r, up = [0, 1, 0], seg = 14) {
    const yAxis = norm(up)
    const xAxis = norm(Math.abs(yAxis[0]) < 0.9 ? cross(yAxis, [1, 0, 0]) : cross(yAxis, [0, 0, 1]))
    const zAxis = cross(xAxis, yAxis)
    const base = this.pos.length / 3
    const rings = seg
    for (let i = 0; i <= rings; i++) {
      const th = (i / rings) * Math.PI
      for (let j = 0; j <= seg; j++) {
        const ph = (j / seg) * Math.PI * 2
        const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]
        const local = [u[0] * r[0], u[1] * r[1], u[2] * r[2]]
        const p = add(c, add(add(scale(xAxis, local[0]), scale(yAxis, local[1])), scale(zAxis, local[2])))
        const ln = [u[0] / r[0], u[1] / r[1], u[2] / r[2]]
        const n = norm(add(add(scale(xAxis, ln[0]), scale(yAxis, ln[1])), scale(zAxis, ln[2])))
        this.pos.push(...p)
        this.nrm.push(...n)
      }
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j
        const b = a + seg + 1
        this.idx.push(a, b, a + 1, a + 1, b, b + 1)
      }
    return this
  }
  /** Tube through points with per-point radii; ends capped with spheres. */
  tube(points, radii, seg = 10) {
    const base = this.pos.length / 3
    for (let i = 0; i < points.length; i++) {
      const t = norm(i < points.length - 1 ? sub(points[i + 1], points[i]) : sub(points[i], points[i - 1]))
      const a = norm(Math.abs(t[1]) < 0.9 ? cross(t, [0, 1, 0]) : cross(t, [1, 0, 0]))
      const b = cross(t, a)
      for (let j = 0; j <= seg; j++) {
        const ph = (j / seg) * Math.PI * 2
        const n = add(scale(a, Math.cos(ph)), scale(b, Math.sin(ph)))
        this.pos.push(...add(points[i], scale(n, radii[i])))
        this.nrm.push(...n)
      }
    }
    for (let i = 0; i < points.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const p = base + i * (seg + 1) + j
        const q = p + seg + 1
        this.idx.push(p, p + 1, q, p + 1, q + 1, q)
      }
    this.ellipsoid(points[0], [radii[0], radii[0], radii[0]], [0, 1, 0], 8)
    this.ellipsoid(points.at(-1), [radii.at(-1), radii.at(-1), radii.at(-1)], [0, 1, 0], 8)
    return this
  }
  done() {
    return { pos: Float32Array.from(this.pos), nrm: Float32Array.from(this.nrm), idx: Uint32Array.from(this.idx) }
  }
}

/** Ray–triangle intersection (Möller–Trumbore); returns distance or -1. */
function rayTri(o, d, a, b, c) {
  const e1 = sub(b, a)
  const e2 = sub(c, a)
  const p = cross(d, e2)
  const det = dot(e1, p)
  if (Math.abs(det) < 1e-12) return -1
  const inv = 1 / det
  const s = sub(o, a)
  const u = dot(s, p) * inv
  if (u < 0 || u > 1) return -1
  const q = cross(s, e1)
  const v = dot(d, q) * inv
  if (v < 0 || u + v > 1) return -1
  const t = dot(e2, q) * inv
  return t > 0 ? t : -1
}

/* ---------------- coccyx (approximate) ---------------- */

function coccyx() {
  const sac = merge(byId.get('sacrum').parts)
  let apex = null
  for (let v = 0; v < sac.pos.length / 3; v++)
    if (!apex || sac.pos[v * 3 + 1] < apex[1]) apex = [sac.pos[v * 3], sac.pos[v * 3 + 1], sac.pos[v * 3 + 2]]
  // Four fused, tapering segments curving forward and down (~3.5 cm).
  const s = new Shape()
  const segs = 4
  let y = apex[1] + 0.003
  let z = apex[2]
  for (let i = 0; i < segs; i++) {
    const t = i / segs
    const h = 0.0095 * (1 - t * 0.35)
    const w = 0.016 * (1 - t) ** 0.8 + 0.003
    s.ellipsoid([apex[0], y - h / 2, z + 0.002], [w, h * 0.62, w * 0.5], [0, 1, 0.25 * t], 14)
    y -= h * 0.92
    z += 0.003 + 0.002 * i
  }
  return s.done()
}

/* ---------------- auditory ossicles (approximate) ---------------- */

/** Finds the deepest point of the external acoustic meatus in a temporal bone by ray-casting inwards. */
function findMeatus(side) {
  const sgn = side === 'left' ? 1 : -1
  const g = merge(byId.get(`temporal_bone_${side}`).parts)
  const { min, max } = bounds(g.pos)
  const tris = []
  for (let t = 0; t < g.idx.length; t += 3) {
    const v = [0, 1, 2].map((k) => [g.pos[g.idx[t + k] * 3], g.pos[g.idx[t + k] * 3 + 1], g.pos[g.idx[t + k] * 3 + 2]])
    tris.push(v)
  }
  const step = 0.001
  const ny = Math.round((max[1] - min[1]) / step)
  const nz = Math.round((max[2] - min[2]) / step)
  const depth = [] // |x| of the first hit, or null
  for (let iy = 0; iy <= ny; iy++) {
    const row = []
    for (let iz = 0; iz <= nz; iz++) {
      const o = [sgn * 0.15, min[1] + iy * step, min[2] + iz * step]
      const d = [-sgn, 0, 0]
      let best = Infinity
      for (const [a, b, c] of tris) {
        const t = rayTri(o, d, a, b, c)
        if (t > 0 && t < best) best = t
      }
      row.push(best === Infinity ? null : Math.abs(o[0] - sgn * best))
    }
    depth.push(row)
  }
  // Prior: the centre of the auricle ("External ear" covers both ears; take this side's half).
  const ear = atlas.parts.find((p) => p.name === 'External ear')
  const eb = chunks[ear.chunk]
  const ep = new Float32Array(eb.buffer.slice(eb.byteOffset + ear.positions, eb.byteOffset + ear.positions + ear.vertexCount * 12))
  let ey = 0
  let ez = 0
  let en = 0
  for (let v = 0; v < ep.length; v += 3)
    if (ep[v] * sgn > 0) {
      ey += ep[v + 1]
      ez += ep[v + 2]
      en++
    }
  ey /= en
  ez /= en
  // The bony canal: rays near the auricle that reach deep into the bone (|x| < 4.5 cm).
  const canal = []
  for (let iy = 0; iy <= ny; iy++)
    for (let iz = 0; iz <= nz; iz++) {
      const y = min[1] + iy * step
      const z = min[2] + iz * step
      const d = depth[iy][iz]
      if (d != null && d < 0.045 && Math.hypot(y - ey, z - ez) < 0.012) canal.push({ d, y, z })
    }
  if (canal.length < 4) throw new Error(`no external acoustic meatus found in temporal_bone_${side}`)
  canal.sort((a, b) => a.d - b.d)
  const membrane = canal[Math.floor(canal.length / 2)].d // median depth ≈ the tympanic ring
  const y = canal.reduce((s, c) => s + c.y, 0) / canal.length
  const z = canal.reduce((s, c) => s + c.z, 0) / canal.length
  console.log(`${side} meatus: y=${y.toFixed(3)} z=${z.toFixed(3)} tympanic ring |x|=${membrane.toFixed(3)} (${canal.length} rays)`)
  return [sgn * membrane, y, z]
}

/**
 * Builds the three ossicles of one ear around the tympanic cavity. Offsets are in mm in a local
 * frame: L = lateral, S = superior, A = anterior. Sizes follow typical adult dimensions
 * (malleus ~8 mm, incus ~7 mm, stapes ~3.3 mm); shapes are simplified.
 */
function ossicles(side) {
  const sgn = side === 'left' ? 1 : -1
  const ring = findMeatus(side) // tympanic ring at the inner end of the bony external acoustic meatus
  const O = [ring[0] - sgn * 0.0025, ring[1], ring[2]] // centre of the tympanic cavity, just medial to it
  const P = (L, S, A) => [O[0] + sgn * L * 0.001, O[1] + S * 0.001, O[2] + A * 0.001]
  const mm = (v) => v * 0.001
  const malleus = new Shape()
    .ellipsoid(P(1.0, 3.6, 0.6), [mm(1.2), mm(1.6), mm(1.35)])
    .tube([P(1.1, 2.3, 0.7), P(1.5, 0.6, 0.3), P(1.9, -1.4, -0.2), P(2.1, -3.0, -0.6)], [mm(0.6), mm(0.5), mm(0.4), mm(0.32)])
    .tube([P(1.3, 1.9, 0.7), P(2.1, 1.6, 0.9)], [mm(0.4), mm(0.3)]) // lateral process
    .tube([P(1.0, 2.6, 1.0), P(0.9, 2.7, 2.6)], [mm(0.3), mm(0.15)]) // anterior process
    .done()
  const incus = new Shape()
    .ellipsoid(P(0.7, 3.3, -1.5), [mm(1.15), mm(1.5), mm(1.3)], [0, 1, -0.3])
    .tube([P(0.7, 3.6, -2.2), P(0.6, 3.6, -3.4), P(0.5, 3.4, -4.2)], [mm(0.65), mm(0.45), mm(0.3)]) // short process
    .tube([P(0.6, 2.4, -2.0), P(0.5, 0.6, -1.9), P(0.3, -1.3, -1.7), P(-0.4, -1.8, -1.5)], [mm(0.5), mm(0.42), mm(0.34), mm(0.3)]) // long + lenticular process
    .done()
  const stapes = new Shape()
    .ellipsoid(P(-0.85, -1.85, -1.5), [mm(0.45), mm(0.4), mm(0.45)])
    .tube([P(-1.2, -1.85, -1.5), P(-2.2, -1.85, -0.6), P(-3.1, -1.85, -0.25)], [mm(0.22), mm(0.2), mm(0.2)]) // anterior crus
    .tube([P(-1.2, -1.85, -1.5), P(-2.2, -1.85, -2.4), P(-3.1, -1.85, -2.75)], [mm(0.22), mm(0.2), mm(0.2)]) // posterior crus
    .ellipsoid(P(-3.3, -1.85, -1.5), [mm(0.7), mm(0.25), mm(1.5)], [1, 0, 0]) // footplate in the oval window
    .done()
  return { malleus, incus, stapes }
}

const approx = {}
byId.set('coccyx', { id: 'coccyx', kind: 'bone', parts: [coccyx()], sources: [] })
approx.coccyx = 'Approximate shape: BodyParts3D has no coccyx mesh.'
for (const side of ['left', 'right']) {
  const o = ossicles(side)
  for (const k of ['malleus', 'incus', 'stapes']) {
    byId.set(`${k}_${side}`, { id: `${k}_${side}`, kind: 'bone', parts: [o[k]], sources: [] })
    approx[`${k}_${side}`] = 'Simplified shape: BodyParts3D has no auditory ossicle meshes.'
  }
}

/* ---------------- female: real Visible Human Female bones + fitted derived parts (see female.mjs) ---------------- */

if (sex === 'female') {
  const { feminize } = await import('./female.mjs')
  await feminize({ byId, approx, hraFile, merge, bounds })
}

/* ---------------- write GLB ---------------- */

// Context meshes (cartilage, discs, teeth) are never selected individually: one mesh, one draw call.
const ctx = [...byId.values()].filter((e) => e.kind === 'context')
for (const e of ctx) byId.delete(e.id)
byId.set('ctx_context', { id: 'ctx_context', kind: 'context', parts: ctx.flatMap((e) => e.parts), sources: [`${ctx.length} meshes: costal cartilages, intervertebral discs, teeth`] })

const meshes = [...byId.values()]
  .sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'bone' ? -1 : 1))
  .map((e) => {
    const g = merge(e.parts)
    const { min, max } = bounds(g.pos)
    const center = min.map((v, k) => (v + max[k]) / 2)
    for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) g.pos[i + k] -= center[k]
    let r2 = 0
    for (let i = 0; i < g.pos.length; i += 3) r2 = Math.max(r2, g.pos[i] ** 2 + g.pos[i + 1] ** 2 + g.pos[i + 2] ** 2)
    return { ...e, ...g, center, radius: Math.sqrt(r2) }
  })

function writeGlb(file) {
  const json = { asset: { version: '2.0', generator: 'atlas build-skeleton' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] }
  const blobs = []
  let offset = 0
  const view = (arr, target) => {
    const bytes = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target })
    blobs.push(bytes)
    offset += bytes.length
    const pad = (4 - (offset % 4)) % 4
    if (pad) {
      blobs.push(Buffer.alloc(pad))
      offset += pad
    }
    return json.bufferViews.length - 1
  }
  for (const m of meshes) {
    const { min, max } = bounds(m.pos)
    const small = m.pos.length / 3 < 65536
    const idx = small ? Uint16Array.from(m.idx) : m.idx
    const p = json.accessors.push({ bufferView: view(m.pos, 34962), componentType: 5126, count: m.pos.length / 3, type: 'VEC3', min, max }) - 1
    const n = json.accessors.push({ bufferView: view(m.nrm, 34962), componentType: 5126, count: m.nrm.length / 3, type: 'VEC3' }) - 1
    const i = json.accessors.push({ bufferView: view(idx, 34963), componentType: small ? 5123 : 5125, count: idx.length, type: 'SCALAR' }) - 1
    json.meshes.push({ name: m.id, primitives: [{ attributes: { POSITION: p, NORMAL: n }, indices: i }] })
    const extras = { kind: m.kind, source: m.sourceLabel ?? (m.sources.length ? `BodyParts3D 4.0: ${m.sources.join('; ')}` : 'generated') }
    if (m.origin) extras.origin = m.origin
    if (approx[m.id]) extras.approximate = approx[m.id]
    json.scenes[0].nodes.push(json.nodes.push({ name: m.id, mesh: json.meshes.length - 1, translation: m.center, extras }) - 1)
  }
  json.buffers.push({ byteLength: offset })
  const bin = Buffer.concat(blobs)
  let jsonBuf = Buffer.from(JSON.stringify(json))
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)])
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8)
  const ch = (len, type) => {
    const b = Buffer.alloc(8)
    b.writeUInt32LE(len, 0)
    b.writeUInt32LE(type, 4)
    return b
  }
  writeFileSync(file, Buffer.concat([header, ch(jsonBuf.length, 0x4e4f534a), jsonBuf, ch(bin.length, 0x004e4942), bin]))
}

const tmp = join(root, 'node_modules', '.tmp')
mkdirSync(tmp, { recursive: true })
const raw = join(tmp, `skeleton-${sex}-raw.glb`)
writeGlb(raw)
const tris = meshes.reduce((n, m) => n + m.idx.length / 3, 0)
console.log(`raw: ${meshes.filter((m) => m.kind === 'bone').length} bones + ${meshes.filter((m) => m.kind === 'context').length} context meshes, ${tris} triangles`)

// Draco-compress (gltf-transform, MIT). Node names, translations and extras are kept.
const out = join(root, 'public', 'models', `skeleton-${sex}.glb`)
const gt = join(root, 'node_modules', '.bin', 'gltf-transform')
execFileSync(gt, ['draco', raw, out, '--quantize-position', '12', '--quantize-normal', '8'], { stdio: 'inherit' })

const r4 = (v) => Math.round(v * 10000) / 10000
const manifest = {
  sex,
  source:
    sex === 'female'
      ? 'Visible Human Female via HuBMAP HRA v1.5 (CC BY 4.0) + BodyParts3D 4.0 (© DBCLS, CC BY 4.0), fitted'
      : 'BodyParts3D 4.0 (© DBCLS, CC BY 4.0)',
  triangles: tris,
  meshes: Object.fromEntries(
    meshes.map((m) => [m.id, { kind: m.kind, center: m.center.map(r4), radius: r4(m.radius), triangles: m.idx.length / 3, ...(m.origin ? { origin: m.origin } : {}), ...(approx[m.id] ? { approximate: true } : {}) }]),
  ),
}
mkdirSync(join(root, 'src', 'data'), { recursive: true })
writeFileSync(join(root, 'src', 'data', `model-${sex}.json`), JSON.stringify(manifest, null, 1) + '\n')
console.log(`wrote ${out} and src/data/model-${sex}.json`)
