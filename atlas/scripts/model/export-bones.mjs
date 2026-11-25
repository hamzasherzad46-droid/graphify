// Exports every bone's world-space vertices from an Atlas skeleton GLB to a binary + JSON index.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { writeFileSync } from 'node:fs'
const [inp, out] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read(inp)
const index = {}
const chunks = []
let off = 0
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const m = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const a = prim.getAttribute('POSITION').getArray()
    const w = new Float32Array(a.length)
    for (let i = 0; i < a.length; i += 3) {
      const [x, y, z] = [a[i], a[i + 1], a[i + 2]]
      w[i] = m[0] * x + m[4] * y + m[8] * z + m[12]
      w[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
      w[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    }
    const idx = prim.getIndices().getArray()
    index[node.getName()] = { off, n: a.length / 3, ioff: off + a.length, ni: idx.length }
    chunks.push(w, Float32Array.from(idx))
    off += a.length + idx.length
  }
}
const all = new Float32Array(off)
let k = 0
for (const c of chunks) { all.set(c, k); k += c.length }
writeFileSync(out + '.bin', Buffer.from(all.buffer))
writeFileSync(out + '.json', JSON.stringify(index))
console.log(Object.keys(index).length, 'meshes')
