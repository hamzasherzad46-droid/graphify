import { readFileSync } from 'node:fs'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
globalThis.self = globalThis
const buf = readFileSync(process.argv[2])
console.warn = () => {}
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
const depth = +(process.argv[3] ?? 2)
const walk = (o, d) => {
  if (d > depth) return
  const meshes = []; o.traverse((x) => x.isMesh && meshes.push(x))
  console.log('  '.repeat(d) + `${o.name || '(root)'} [${o.type}] children=${o.children.length} meshes=${meshes.length}`)
  for (const c of o.children) if (c.children.length || d < 1) walk(c, d + 1)
}
walk(root, 0)
