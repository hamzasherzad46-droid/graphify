#!/usr/bin/env node
/**
 * Build public/models/skeleton.glb from BodyParts3D 4.0 bone meshes.
 *
 * Source: the `@dagno/anatomy-model` npm package (BodyParts3D 4.0, CC BY 4.0), which stores
 * meshes as raw binary chunks + atlas.json. Get it without installing:
 *
 *   mkdir -p /tmp/bp3d && cd /tmp/bp3d && npm pack --ignore-scripts @dagno/anatomy-model && tar xzf *.tgz
 *   node scripts/import-bodyparts3d.mjs /tmp/bp3d/package/model /tmp/skeleton-raw.glb --fit-cameras content/skeleton.json
 *   scripts/convert-model.sh /tmp/skeleton-raw.glb skeleton
 *
 * What it does:
 *   - keeps bones (plus teeth, costal cartilages and intervertebral discs for realism)
 *   - renames meshes to the keys used by content/skeleton.json (e.g. "Left first rib" → rib_1.l)
 *     and stores the original BodyParts3D name and id in each node's `extras`
 *   - splits the medial and lateral epicondyles off each humerus so they can be highlighted
 *   - adds an approximate coccyx (BodyParts3D has no coccyx mesh)
 *   - optionally re-frames every structure's camera from the real bone positions,
 *     keeping each camera's viewing direction
 *
 * Plain Node (>= 18), no dependencies. Coordinates are already atlas space:
 * metres, Y up, body faces +Z, body's left at +X.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'

const [atlasDir, outFile, ...rest] = process.argv.slice(2)
if (!atlasDir || !outFile) {
  console.error('usage: import-bodyparts3d.mjs <atlas-dir> <out.glb> [--fit-cameras content/skeleton.json]')
  process.exit(1)
}
const fitIdx = rest.indexOf('--fit-cameras')
const contentFile = fitIdx >= 0 ? rest[fitIdx + 1] : null

/* ---------- Name mapping: BodyParts3D name → mesh name ---------- */

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
const ordNum = (w) => ORD.indexOf(w) + 1
const FINGER = { thumb: 1, index: 2, middle: 3, ring: 4, little: 5 }
const TOE = { big: 1, second: 2, third: 3, fourth: 4, little: 5 }
const SEG = { proximal: 1, middle: 2, distal: 3 }

const SIMPLE = {
  'frontal bone': 'frontal',
  'occipital bone': 'occipital',
  'sphenoid bone': 'sphenoid',
  ethmoid: 'ethmoid',
  vomer: 'vomer',
  mandible: 'mandible',
  'hyoid bone': 'hyoid',
  atlas: 'cervical_1',
  axis: 'cervical_2',
  sacrum: 'sacrum',
  manubrium: 'manubrium',
  'body of sternum': 'sternal_body',
  'xiphoid process': 'xiphoid_process',
}
const PAIRED = {
  'parietal bone': 'parietal',
  'temporal bone': 'temporal',
  'nasal bone': 'nasal',
  'zygomatic bone': 'zygomatic',
  maxilla: 'maxilla',
  'palatine bone': 'palatine',
  'lacrimal bone': 'lacrimal',
  'inferior nasal concha': 'inferior_nasal_concha',
  clavicle: 'clavicle',
  scapula: 'scapula',
  humerus: 'humerus',
  radius: 'radius',
  ulna: 'ulna',
  scaphoid: 'scaphoid',
  lunate: 'lunate',
  triquetral: 'triquetral',
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

let toothN = 0
function meshNameFor(name) {
  const n = name.toLowerCase()
  if (SIMPLE[n]) return SIMPLE[n]
  let m
  if ((m = n.match(/^(left|right) (.+)$/)) && PAIRED[m[2]]) return `${PAIRED[m[2]]}.${m[1][0]}`
  if ((m = n.match(/^navicular bone of (left|right) foot$/))) return `navicular.${m[1][0]}`
  if ((m = n.match(/^sesamoid bone of (left|right) foot$/))) return `foot_sesamoid.${m[1][0]}`
  if ((m = n.match(/^(\w+) cervical vertebra$/))) return `cervical_${ordNum(m[1])}`
  if ((m = n.match(/^(\w+) thoracic vertebra$/))) return `thoracic_${ordNum(m[1])}`
  if ((m = n.match(/^(\w+) lumbar vertebra$/))) return `lumbar_${ordNum(m[1])}`
  if ((m = n.match(/^(left|right) (\w+) rib$/))) return `rib_${ordNum(m[2])}.${m[1][0]}`
  if ((m = n.match(/^(left|right) (\w+) costal cartilage$/))) return `costal_cartilage_${ordNum(m[2])}.${m[1][0]}`
  if ((m = n.match(/^(left|right) (\w+) metacarpal bone$/))) return `metacarpal_${ordNum(m[2])}.${m[1][0]}`
  if ((m = n.match(/^(left|right) (\w+) metatarsal bone$/))) return `metatarsal_${ordNum(m[2])}.${m[1][0]}`
  if ((m = n.match(/^(proximal|middle|distal) phalanx of (left|right) (thumb|index finger|middle finger|ring finger|little finger)$/)))
    return `hand_phalanx_${FINGER[m[3].split(' ')[0]]}${SEG[m[1]]}.${m[2][0]}`
  if ((m = n.match(/^(proximal|middle|distal) phalanx of (left|right) (big|second|third|fourth|little) toe$/)))
    return `foot_phalanx_${TOE[m[3]]}${SEG[m[1]]}.${m[2][0]}`
  if ((m = n.match(/^intervertebral disk(?: of (\w+) (cervical|thoracic|lumbar) vertebra| of axis)?$/)))
    return m[1] ? `intervertebral_disc_${m[2]}_${ordNum(m[1])}` : n.includes('axis') ? 'intervertebral_disc_cervical_2' : 'intervertebral_disc_lumbosacral'
  if (/ secondary .*tooth$/.test(n)) return `tooth_${++toothN}`
  return null // muscles, tendons, laryngeal cartilages, gingiva … are skipped
}

/* ---------- Read the atlas ---------- */

const atlas = JSON.parse(readFileSync(join(atlasDir, 'atlas.json'), 'utf8'))
const chunks = atlas.chunks.map((c) => gunzipSync(readFileSync(join(atlasDir, c.gzip))))
const wanted = atlas.parts.filter((p) => ['skeletal', 'sensory', 'respiratory'].includes(p.system) || /tooth$/i.test(p.name))

const meshes = [] // { name, extras, pos: Float32Array, nrm: Float32Array, idx: Uint32Array }
for (const p of wanted) {
  const name = meshNameFor(p.name)
  if (!name) continue
  const buf = chunks[p.chunk]
  const n = p.vertexCount
  const pos = new Float32Array(buf.buffer.slice(buf.byteOffset + p.positions, buf.byteOffset + p.positions + n * 12))
  const sn = new Int16Array(buf.buffer.slice(buf.byteOffset + p.normals, buf.byteOffset + p.normals + n * 6))
  const nrm = Float32Array.from(sn, (v) => Math.max(v / 32767, -1))
  const idx = new Uint32Array(buf.buffer.slice(buf.byteOffset + p.indices, buf.byteOffset + p.indices + p.indexCount * 4))
  meshes.push({ name, extras: { source: 'BodyParts3D 4.0', id: p.id, name: p.name }, pos, nrm, idx })
}

/* ---------- Split epicondyles off each humerus ---------- */

function bounds(pos) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k])
      max[k] = Math.max(max[k], pos[i + k])
    }
  return { min, max }
}

/** Splits a mesh's triangles by predicate into [kept, taken], re-indexing vertices. */
function splitMesh(mesh, takeTriangle) {
  const parts = [{ map: new Map(), pos: [], nrm: [], idx: [] }, { map: new Map(), pos: [], nrm: [], idx: [] }]
  for (let t = 0; t < mesh.idx.length; t += 3) {
    const tri = [mesh.idx[t], mesh.idx[t + 1], mesh.idx[t + 2]]
    const part = parts[takeTriangle(tri) ? 1 : 0]
    for (const v of tri) {
      let nv = part.map.get(v)
      if (nv === undefined) {
        nv = part.pos.length / 3
        part.map.set(v, nv)
        part.pos.push(mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2])
        part.nrm.push(mesh.nrm[v * 3], mesh.nrm[v * 3 + 1], mesh.nrm[v * 3 + 2])
      }
      part.idx.push(nv)
    }
  }
  return parts.map((p) => ({ pos: Float32Array.from(p.pos), nrm: Float32Array.from(p.nrm), idx: Uint32Array.from(p.idx) }))
}

const EPICONDYLE_RADIUS = { medial: 0.017, lateral: 0.014 }
const landmarks = {}
for (const side of ['l', 'r']) {
  const i = meshes.findIndex((m) => m.name === `humerus.${side}`)
  if (i < 0) continue
  const hum = meshes[i]
  const { min, max } = bounds(hum.pos)
  const distalY = min[1] + 0.1 * (max[1] - min[1])
  const sign = side === 'l' ? 1 : -1 // body's left is +X; medial = towards the midline
  let medial = null
  let lateral = null
  for (let v = 0; v < hum.pos.length / 3; v++) {
    const x = hum.pos[v * 3] * sign
    if (hum.pos[v * 3 + 1] > distalY) continue
    if (!medial || x < medial[0] * sign) medial = [hum.pos[v * 3], hum.pos[v * 3 + 1], hum.pos[v * 3 + 2]]
    if (!lateral || x > lateral[0] * sign) lateral = [hum.pos[v * 3], hum.pos[v * 3 + 1], hum.pos[v * 3 + 2]]
  }
  landmarks[`medial_epicondyle.${side}`] = medial
  landmarks[`lateral_epicondyle.${side}`] = lateral
  let current = hum
  const out = []
  for (const [kind, point] of [['medial', medial], ['lateral', lateral]]) {
    const r2 = EPICONDYLE_RADIUS[kind] ** 2
    const near = (v) => (current.pos[v * 3] - point[0]) ** 2 + (current.pos[v * 3 + 1] - point[1]) ** 2 + (current.pos[v * 3 + 2] - point[2]) ** 2 < r2
    const [kept, taken] = splitMesh(current, (tri) => {
      // triangle centroid inside the sphere
      const c = [0, 1, 2].map((k) => (current.pos[tri[0] * 3 + k] + current.pos[tri[1] * 3 + k] + current.pos[tri[2] * 3 + k]) / 3)
      return (c[0] - point[0]) ** 2 + (c[1] - point[1]) ** 2 + (c[2] - point[2]) ** 2 < r2 && tri.some(near)
    })
    out.push({ name: `${kind}_epicondyle.${side}`, extras: { source: 'BodyParts3D 4.0 (split from humerus)', landmark: true }, ...taken })
    current = { ...current, ...kept }
  }
  meshes.splice(i, 1, { ...hum, ...current }, ...out)
}

/* ---------- Approximate coccyx (not in BodyParts3D) ---------- */

function coccyx() {
  const sac = meshes.find((m) => m.name === 'sacrum')
  // Apex of the sacrum: its lowest vertex.
  let apex = null
  for (let v = 0; v < sac.pos.length / 3; v++) if (!apex || sac.pos[v * 3 + 1] < apex[1]) apex = [sac.pos[v * 3], sac.pos[v * 3 + 1], sac.pos[v * 3 + 2]]
  // One smooth, tapering loft curving forward and down (about 3.5 cm long), with a
  // slight waist between its four fused segments. Elliptical section: wider than deep.
  const rings = 28
  const around = 20
  const length = 0.034
  const pos = []
  for (let r = 0; r <= rings; r++) {
    const t = r / rings
    const cy = apex[1] + 0.004 - length * t
    const cz = apex[2] + 0.012 * t * t // curves forward
    const taper = 0.016 * (1 - t) ** 0.85 + 0.0012
    const waist = 1 - 0.1 * Math.max(0, Math.sin(t * Math.PI * 4)) ** 4
    const w = taper * waist
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2
      pos.push(apex[0] + Math.cos(a) * w, cy, cz + Math.sin(a) * w * 0.5)
    }
  }
  const idx = []
  for (let r = 0; r < rings; r++)
    for (let k = 0; k < around; k++) {
      const a = r * around + k
      const b = r * around + ((k + 1) % around)
      idx.push(a, a + around, b, b, a + around, b + around)
    }
  // Close the tip with a single point.
  const tip = pos.length / 3
  pos.push(apex[0], apex[1] + 0.004 - length - 0.0015, apex[2] + 0.012)
  for (let k = 0; k < around; k++) idx.push(rings * around + k, tip, rings * around + ((k + 1) % around))
  // Smooth vertex normals from face normals.
  const nrm = new Float32Array(pos.length)
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3]
    const u = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]]
    const v = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    for (const p of [a, b, c]) for (let k = 0; k < 3; k++) nrm[p + k] += n[k]
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1
    nrm[i] /= l
    nrm[i + 1] /= l
    nrm[i + 2] /= l
  }
  return {
    name: 'coccyx',
    extras: { source: 'approximate shape (BodyParts3D has no coccyx mesh)' },
    pos: Float32Array.from(pos),
    nrm,
    idx: Uint32Array.from(idx),
  }
}
meshes.push(coccyx())

/* ---------- Write GLB ---------- */

function writeGlb(meshes, file) {
  const json = { asset: { version: '2.0', generator: 'atlas import-bodyparts3d' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] }
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
    json.meshes.push({ name: m.name, primitives: [{ attributes: { POSITION: p, NORMAL: n }, indices: i }] })
    json.scenes[0].nodes.push(json.nodes.push({ name: m.name, mesh: json.meshes.length - 1, extras: m.extras }) - 1)
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

writeGlb(meshes, outFile)
const tris = meshes.reduce((n, m) => n + m.idx.length / 3, 0)
console.log(`wrote ${outFile}: ${meshes.length} meshes, ${tris} triangles`)

/* ---------- Re-frame cameras from real bone positions ---------- */

/** JSON with 2-space indent, but short arrays and the camera object kept on one line (the content files' style). */
function compactJson(value) {
  const text = JSON.stringify(value, null, 2)
  return text
    .replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (_, inner) => `[${inner.split(/,\n\s*/).join(', ')}]`)
    .replace(/"camera": \{\n\s*("position": \[[^\]]*\]),\n\s*("target": \[[^\]]*\])\n\s*\}/g, '"camera": { $1, $2 }')
    .replace(/\{\n\s*("id": "[^"]*"),\n\s*("name": "[^"]*")\n\s*\}/g, '{ $1, $2 }') // regions
}

if (contentFile) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const SUFFIX = /^(\d*)(l|r|left|right)?(\d*)$/
  const matches = (mesh, key) => {
    const m = norm(mesh)
    const k = norm(key)
    return m.startsWith(k) && SUFFIX.test(m.slice(k.length))
  }
  const FOV = (35 * Math.PI) / 180
  const content = JSON.parse(readFileSync(contentFile, 'utf8'))
  for (const s of content.structures) {
    const keys = Array.isArray(s.meshName) ? s.meshName : [s.meshName]
    // Frame the side the existing camera looks at (right side, -X, for paired bones).
    const side = s.camera.target[0] < -0.01 ? 'r' : s.camera.target[0] > 0.01 ? 'l' : null
    let hit = meshes.filter((m) => keys.some((k) => matches(m.name, k)))
    const sided = side ? hit.filter((m) => m.name.endsWith(`.${side}`)) : hit
    if (sided.length) hit = sided
    if (!hit.length) {
      console.warn(`no mesh for ${s.id}`)
      continue
    }
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (const m of hit) {
      const b = bounds(m.pos)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], b.min[k])
        max[k] = Math.max(max[k], b.max[k])
      }
    }
    const center = min.map((v, k) => (v + max[k]) / 2)
    const radius = Math.hypot(...max.map((v, k) => v - min[k])) / 2
    const dir = s.camera.position.map((v, k) => v - s.camera.target[k])
    const len = Math.hypot(...dir)
    // Fit the structure with some surrounding context; never closer than 0.32 m.
    const dist = Math.max(0.32, (radius / Math.sin(FOV / 2)) * 1.15)
    const r3 = (v) => Math.round(v * 1000) / 1000
    s.camera = { position: center.map((c, k) => r3(c + (dir[k] / len) * dist)), target: center.map(r3) }
  }
  writeFileSync(contentFile, compactJson(content) + '\n')
  console.log(`updated cameras in ${contentFile}`)
}
