// Post-processes dist-artifact/ for the sandboxed preview host: models as base64 text, and no files it doesn't use.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(import.meta.dirname, '..', 'dist-artifact')
for (const f of readdirSync(join(dist, 'models')).filter((f) => f.endsWith('.glb'))) {
  const p = join(dist, 'models', f)
  writeFileSync(`${p}.b64.txt`, readFileSync(p).toString('base64'))
  rmSync(p)
}
for (const f of readdirSync(join(dist, 'assets')).filter((f) => f.startsWith('draco_'))) rmSync(join(dist, 'assets', f))
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js']) rmSync(join(dist, 'draco', f), { force: true })
rmSync(join(dist, 'models', 'README.md'), { force: true })
// The preview host allows 512 files: the figures of the nervous system and blood vessel chapters (12 onwards) are left
// out; the reader shows each figure's description instead.
const sections = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'content', 'textbook', 'index.json'), 'utf8')).sections
const keep = new Set()
const later = new Set()
for (const s of sections) {
  const text = readFileSync(join(import.meta.dirname, '..', 'content', 'textbook', `${s.id}.json`), 'utf8')
  for (const m of text.matchAll(/"src":"textbook\/([^"]+)"/g)) (s.chapter >= 12 ? later : keep).add(m[1])
}
let dropped = 0
for (const f of later) if (!keep.has(f)) rmSync(join(dist, 'textbook', f), { force: true }), dropped++
console.log(`preview: ${dropped} figures of chapters 12 onwards left out`)
console.log('preview assets ready')
