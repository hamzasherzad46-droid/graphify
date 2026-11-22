// Shared geometry helpers for the model build scripts: FBX reading, welding/simplifying, GLB writing.
import { readFileSync, writeFileSync } from 'node:fs'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MeshoptSimplifier } from 'meshoptimizer'

globalThis.self ??= globalThis // FBXLoader expects a browser-like global

/** Reads an FBX file; returns the three.js root (world matrices updated). Z-Anatomy FBX units are cm. */
export function readFbx(file) {
  const buf = readFileSync(file)
  const warn = console.warn
  console.warn = () => {}
  try {
    const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
    root.updateMatrixWorld(true)
    return root
  } finally {
    console.warn = warn
  }
}

/** A mesh's own geometry in world space (children excluded), scaled to metres, as { pos, idx } (not welded). */
export function worldGeometry(mesh, unit = 0.01) {
  const g = mesh.geometry
  const P = g.attributes.position
  const e = mesh.matrixWorld.elements
  const pos = new Float32Array(P.count * 3)
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i)
    const y = P.getY(i)
    const z = P.getZ(i)
    pos[i * 3] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * unit
    pos[i * 3 + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * unit
    pos[i * 3 + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * unit
  }
  const idx = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: P.count }, (_, i) => i)
  // A negative-determinant transform flips winding.
  const det = e[0] * (e[5] * e[10] - e[9] * e[6]) - e[4] * (e[1] * e[10] - e[9] * e[2]) + e[8] * (e[1] * e[6] - e[5] * e[2])
  if (det < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]
  return { pos, idx }
}

export function bounds(pos) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      if (pos[i + k] < min[k]) min[k] = pos[i + k]
      if (pos[i + k] > max[k]) max[k] = pos[i + k]
    }
  return { min, max }
}

export function merge(parts) {
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
    if (p.nrm) nrm.set(p.nrm, ov)
    for (let i = 0; i < p.idx.length; i++) idx[oi + i] = p.idx[i] + ov / 3
    ov += p.pos.length
    oi += p.idx.length
  }
  return { pos, nrm, idx }
}

/** Smooth, area-weighted vertex normals. */
export function computeNormals(pos, idx) {
  const nrm = new Float32Array(pos.length)
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3
    const b = idx[i + 1] * 3
    const c = idx[i + 2] * 3
    const ux = pos[b] - pos[a]
    const uy = pos[b + 1] - pos[a + 1]
    const uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a]
    const vy = pos[c + 1] - pos[a + 1]
    const vz = pos[c + 2] - pos[a + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const k of [a, b, c]) {
      nrm[k] += nx
      nrm[k + 1] += ny
      nrm[k + 2] += nz
    }
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1
    nrm[i] /= l
    nrm[i + 1] /= l
    nrm[i + 2] /= l
  }
  return nrm
}

export const meshoptReady = MeshoptSimplifier.ready

/** Removes vertices no triangle uses; rewrites idx in place and returns the new positions. */
function compact(pos, idx) {
  const [map, unique] = MeshoptSimplifier.compactMesh(idx)
  const out = new Float32Array(unique * 3)
  for (let v = 0; v < map.length; v++) if (map[v] !== 0xffffffff) out.set(pos.subarray(v * 3, v * 3 + 3), map[v] * 3)
  return out
}

/**
 * Welds duplicate positions, simplifies to at most `maxTris` triangles (stopping earlier if the relative
 * error would exceed `error`), drops unused vertices and recomputes smooth normals.
 */
export function cleanMesh({ pos, idx }, { maxTris = Infinity, error = 0.003 } = {}) {
  const remap = MeshoptSimplifier.generatePositionRemap(pos, 3)
  idx = idx.map((i) => remap[i])
  // Drop triangles that collapsed to a line or point when welding.
  const keep = []
  for (let i = 0; i < idx.length; i += 3) if (idx[i] !== idx[i + 1] && idx[i + 1] !== idx[i + 2] && idx[i] !== idx[i + 2]) keep.push(idx[i], idx[i + 1], idx[i + 2])
  idx = Uint32Array.from(keep)
  // Drop the now-unused duplicate vertices first: the simplifier treats coincident vertices as seams and locks them.
  pos = compact(pos, idx)
  // As few triangles as the error allows, then cap the count (accepting more error) if still above maxTris.
  if (error > 0) [idx] = MeshoptSimplifier.simplify(idx, pos, 3, 0, error)
  if (idx.length / 3 > maxTris) [idx] = MeshoptSimplifier.simplify(idx, pos, 3, Math.floor(maxTris) * 3, 0.05)
  const out = compact(pos, idx)
  return { pos: out, idx, nrm: computeNormals(out, idx) }
}

/**
 * Writes a GLB: one node per entry { id, pos, nrm, idx, center, extras }, positions relative to `center`,
 * which becomes the node translation.
 */
export function writeGlb(file, meshes, generator) {
  const json = { asset: { version: '2.0', generator }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] }
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
    json.scenes[0].nodes.push(json.nodes.push({ name: m.id, mesh: json.meshes.length - 1, translation: m.center, extras: m.extras }) - 1)
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
