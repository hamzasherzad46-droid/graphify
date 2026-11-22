import { readFileSync } from 'node:fs'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
globalThis.self = globalThis
const buf = readFileSync(process.argv[2])
console.warn = () => {}
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
const out = []
root.traverse((o) => { if (o.isMesh && (!o.parent?.isMesh)) out.push(`${o.name}|${o.parent?.name}|${(o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3}`) })
console.log(out.join('\n'))
