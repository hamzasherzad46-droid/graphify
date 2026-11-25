#!/usr/bin/env node
/**
 * Exports Z-Anatomy (CC BY-SA 4.0) meshes from one FBX into the Atlas skeleton's space, simplified, as a binary +
 * JSON index for the Python fitting scripts:
 *
 *   node scripts/model/export-za.mjs <FBX dir> <MuscularSystem100|VisceralSystem100|…> <out prefix> [maxTris] [error]
 *
 * Space: metres, Y up, the body facing +Z, its left at +X, shifted like the skeleton build (the lowest bone point at
 * y = 0), so the meshes sit exactly on public/models/skeleton-male.glb. Each mesh keeps its Z-Anatomy name.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readFbx, worldGeometry, cleanMesh, meshoptReady } from '../lib/mesh.mjs'

const [dir, file, out, maxTris = '4000', error = '0.0008'] = process.argv.slice(2)
await meshoptReady

// The skeleton build's vertical shift: its lowest point is the heel (calcaneus).
const skel = readFbx(join(dir, 'SkeletalSystem100.fbx'))
let minY = Infinity
skel.traverse((o) => {
  if (o.isMesh && /^Calcaneus[lr]?$/.test(o.name)) {
    const { pos } = worldGeometry(o)
    for (let i = 1; i < pos.length; i += 3) minY = Math.min(minY, pos[i])
  }
})
if (!Number.isFinite(minY)) throw new Error('no calcaneus found in SkeletalSystem100.fbx')

const root = readFbx(join(dir, `${file}.fbx`))
const index = {}
const chunks = []
let off = 0
let before = 0
let after = 0
root.traverse((o) => {
  if (!o.isMesh || /^Cross_Section/.test(o.name)) return
  const raw = worldGeometry(o)
  for (let i = 1; i < raw.pos.length; i += 3) raw.pos[i] -= minY
  const n0 = raw.idx.length / 3
  const cap = Math.max(150, Math.min(Number(maxTris), Math.round(n0 * 0.25)))
  const g = cleanMesh(raw, { maxTris: cap, error: Number(error) })
  if (!g.idx.length) return
  before += n0
  after += g.idx.length / 3
  let name = o.name
  while (index[name]) name += '+'
  index[name] = { off, n: g.pos.length / 3, ioff: off + g.pos.length, ni: g.idx.length, uv: false }
  chunks.push(Float32Array.from(g.pos), Float32Array.from(g.idx))
  off += g.pos.length + g.idx.length
})
const all = new Float32Array(off)
let k = 0
for (const c of chunks) {
  all.set(c, k)
  k += c.length
}
writeFileSync(out + '.bin', Buffer.from(all.buffer))
writeFileSync(out + '.json', JSON.stringify(index))
console.log(`${file}: ${Object.keys(index).length} meshes, ${before} → ${after} triangles; heel at ${(minY * 100).toFixed(2)} cm`)
