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
console.log('preview assets ready')
