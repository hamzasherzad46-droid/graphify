import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
const doc = await io.read('public/models/tissue/layers-male.glb')
const sk = doc.getRoot().listMeshes().find((m) => m.getName() === 'skin').listPrimitives()[0]
const P = sk.getAttribute('POSITION'), I = sk.getIndices().getArray()
const n = P.getCount(), v = []
const pos = []; for (let i = 0; i < n; i++) pos.push(P.getElement(i, []))
// weld by position
const key = (p) => p.map((x) => Math.round(x * 1e5)).join(',')
const id = new Map(), wid = []; for (let i = 0; i < n; i++) { const k = key(pos[i]); if (!id.has(k)) id.set(k, id.size); wid.push(id.get(k)) }
const ec = new Map(); for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = wid[I[t + e]], b = wid[I[t + (e + 1) % 3]]; const k = a < b ? a + '_' + b : b + '_' + a; ec.set(k, (ec.get(k) || 0) + 1) }
const wpos = []; for (let i = 0; i < n; i++) wpos[wid[i]] = pos[i]
const C = [0.0305, 1.5815, 0.061]
const bnd = [...ec].filter(([, c]) => c === 1).map(([k]) => k.split('_').map(Number)).filter(([a]) => Math.hypot(wpos[a][0] - C[0], wpos[a][1] - C[1], wpos[a][2] - C[2]) < 0.03)
console.log('boundary edges near left eye', bnd.length)
const pts = [...new Set(bnd.flat())].map((i) => wpos[i].map((x) => +(x * 1000).toFixed(1)))
pts.sort((a, b) => a[0] - b[0]); console.log(JSON.stringify(pts))
// skin verts in front of eye within 15mm radius (xy)
const near = []; for (let i = 0; i < wpos.length; i++) { const p = wpos[i]; if (p && Math.hypot(p[0] - C[0], p[1] - C[1]) < 0.016 && p[2] > 0.05) near.push(p.map((x) => +(x * 1000).toFixed(1))) }
console.log('near', near.length); near.sort((a, b) => b[1] - a[1]); console.log(JSON.stringify(near.slice(0, 200)))
