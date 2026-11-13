#!/usr/bin/env node
/**
 * Build a module's GLB from BodyParts3D 4.0 meshes (the `@dagno/anatomy-model` package, CC BY 4.0).
 *
 *   node scripts/import-module.mjs <atlas-dir> scripts/modules/<module>.json public/models/<module>-raw.glb \
 *     [--fit-cameras content/<module>.json]
 *
 * The spec lists which BodyParts3D parts to include, as case-insensitive regular expressions
 * matched against the whole part name. Mesh names are generated: side words move to a suffix
 * ("Left biceps brachii" → "biceps_brachii.l", "Anterior part of right superior temporal gyrus"
 * → "anterior_part_of_superior_temporal_gyrus.r"), duplicates get "_2", "_3"… after the side.
 * The original name and id are kept in each node's `extras`.
 *
 * --extra <file.glb> adds meshes from another GLB in the same coordinate space, picked by node name with
 * spec.extraNodes ({ "lung_l": "lung.l" }). Used for organs BodyParts3D 4.0's IS-A set lacks (lungs, liver),
 * taken from the open-anatomy-3d model (CC BY 4.0, also BodyParts3D-derived) after
 * `gltf-transform dequantize` and `gltf-transform flatten` so positions are plain floats at scene root.
 *
 * --fit-cameras frames every structure in the content file around its meshes, keeping the
 * direction of its current camera (position − target). If the target's x is negative the
 * right-side (.r) meshes are framed; positive, the left; zero, both.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'

const [atlasDir, specFile, outFile, ...rest] = process.argv.slice(2)
if (!atlasDir || !specFile || !outFile) {
  console.error('usage: import-module.mjs <atlas-dir> <spec.json> <out.glb> [--fit-cameras content.json]')
  process.exit(1)
}
const fitIdx = rest.indexOf('--fit-cameras')
const contentFile = fitIdx >= 0 ? rest[fitIdx + 1] : null
const extraIdx = rest.indexOf('--extra')
const extraFile = extraIdx >= 0 ? rest[extraIdx + 1] : null
const spec = JSON.parse(readFileSync(specFile, 'utf8'))
const include = spec.include.map((s) => new RegExp(`^(?:${s})$`, 'i'))
const minRadius = spec.minCameraDistance ?? 0.3

export function slugAndSide(name) {
  let side = ''
  const n = name.replace(/\b(left|right)\b\s*/i, (m) => {
    side = m.trim().toLowerCase()[0]
    return ''
  })
  const slug = n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return side ? `${slug}.${side}` : slug
}

const atlas = JSON.parse(readFileSync(join(atlasDir, 'atlas.json'), 'utf8'))
const chunks = atlas.chunks.map((c) => gunzipSync(readFileSync(join(atlasDir, c.gzip))))
const used = new Map()
const meshes = []
const matchedPatterns = new Set()
for (const p of atlas.parts) {
  const hit = include.findIndex((re) => re.test(p.name))
  if (hit < 0) continue
  matchedPatterns.add(hit)
  let name = slugAndSide(p.name)
  const n = (used.get(name) ?? 0) + 1
  used.set(name, n)
  // Number duplicates after the side, so a side-specific key ("x.r") still matches every copy ("x.r_2").
  if (n > 1) name = `${name}_${n}`
  const buf = chunks[p.chunk]
  const v = p.vertexCount
  const pos = new Float32Array(buf.buffer.slice(buf.byteOffset + p.positions, buf.byteOffset + p.positions + v * 12))
  const sn = new Int16Array(buf.buffer.slice(buf.byteOffset + p.normals, buf.byteOffset + p.normals + v * 6))
  const nrm = Float32Array.from(sn, (x) => Math.max(x / 32767, -1))
  const idx = new Uint32Array(buf.buffer.slice(buf.byteOffset + p.indices, buf.byteOffset + p.indices + p.indexCount * 4))
  meshes.push({ name, extras: { source: 'BodyParts3D 4.0', id: p.id, name: p.name, system: p.system }, pos, nrm, idx })
}
/** Reads named meshes (float positions/normals, scene-root nodes with translation/scale) from a GLB. */
function readGlbMeshes(file, nameMap) {
  const b = readFileSync(file)
  const jsonLen = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const read = (accIndex, Ctor, comps) => {
    const acc = json.accessors[accIndex]
    const view = json.bufferViews[acc.bufferView]
    const elem = Ctor.BYTES_PER_ELEMENT * comps
    const stride = view.byteStride ?? elem
    const base = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const out = new Ctor(acc.count * comps)
    for (let i = 0; i < acc.count; i++) {
      const row = new Ctor(b.buffer.slice(b.byteOffset + base + i * stride, b.byteOffset + base + i * stride + elem))
      out.set(row, i * comps)
    }
    return out
  }
  const out = []
  for (const node of json.nodes) {
    const target = nameMap[node.name]
    if (!target || node.mesh === undefined) continue
    if (node.rotation) throw new Error(`${node.name}: rotated nodes are not supported`)
    const s = node.scale ?? [1, 1, 1]
    const t = node.translation ?? [0, 0, 0]
    for (const prim of json.meshes[node.mesh].primitives) {
      const pos = read(prim.attributes.POSITION, Float32Array, 3)
      for (let i = 0; i < pos.length; i++) pos[i] = pos[i] * s[i % 3] + t[i % 3]
      const nrm = read(prim.attributes.NORMAL, Float32Array, 3)
      const idxAcc = json.accessors[prim.indices]
      const idx = Uint32Array.from(read(prim.indices, idxAcc.componentType === 5125 ? Uint32Array : Uint16Array, 1))
      out.push({ name: target, extras: { source: 'open-anatomy-3d (BodyParts3D-derived, CC BY 4.0)', name: node.name }, pos, nrm, idx })
    }
  }
  const missing = Object.keys(nameMap).filter((n) => !out.some((m) => m.extras.name === n))
  if (missing.length) console.warn('extra nodes not found:', missing)
  return out
}

if (extraFile && spec.extraNodes) meshes.push(...readGlbMeshes(extraFile, spec.extraNodes))

const unmatched = spec.include.filter((_, i) => !matchedPatterns.has(i))
if (unmatched.length) console.warn('patterns with no match:', unmatched)

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

function writeGlb(list, file) {
  const json = { asset: { version: '2.0', generator: 'atlas import-module' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] }
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
  for (const m of list) {
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
console.log(`wrote ${outFile}: ${meshes.length} meshes, ${meshes.reduce((n, m) => n + m.idx.length / 3, 0)} triangles`)

/** JSON with 2-space indent, but short arrays, cameras and regions kept on one line (the content files' style). */
function compactJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/\[\n\s*([^[\]{}]*?)\n\s*\]/g, (_, inner) => `[${inner.split(/,\n\s*/).join(', ')}]`)
    .replace(/"camera": \{\n\s*("position": \[[^\]]*\]),\n\s*("target": \[[^\]]*\])\n\s*\}/g, '"camera": { $1, $2 }')
    .replace(/\{\n\s*("id": "[^"]*"),\n\s*("name": "[^"]*")\n\s*\}/g, '{ $1, $2 }')
}

if (contentFile) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const SUFFIX = /^(\d*)(l|r|left|right)?(\d*)$/
  const matches = (mesh, key) => norm(mesh).startsWith(norm(key)) && SUFFIX.test(norm(mesh).slice(norm(key).length))
  const FOV = (35 * Math.PI) / 180
  const content = JSON.parse(readFileSync(contentFile, 'utf8'))
  const missing = []
  for (const s of content.structures) {
    const keys = Array.isArray(s.meshName) ? s.meshName : [s.meshName]
    const side = s.camera.target[0] < -0.01 ? 'r' : s.camera.target[0] > 0.01 ? 'l' : null
    let hit = meshes.filter((m) => keys.some((k) => matches(m.name, k)))
    for (const k of keys) if (!meshes.some((m) => matches(m.name, k))) missing.push(`${s.id}: ${k}`)
    const sided = side ? hit.filter((m) => m.name.endsWith(`.${side}`) || /\.[lr]$/.test(m.name) === false) : hit
    if (sided.length) hit = sided
    if (!hit.length) continue
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
    const dist = Math.max(minRadius, (radius / Math.sin(FOV / 2)) * 1.15)
    const r3 = (v) => Math.round(v * 1000) / 1000
    s.camera = { position: center.map((c, k) => r3(c + (dir[k] / len) * dist)), target: center.map(r3) }
  }
  if (missing.length) console.warn('meshName keys with no mesh:', missing)
  writeFileSync(contentFile, compactJson(content) + '\n')
  console.log(`updated cameras in ${contentFile}`)
}
