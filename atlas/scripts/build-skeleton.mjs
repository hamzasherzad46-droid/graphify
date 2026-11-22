#!/usr/bin/env node
/**
 * Builds the skeleton models from Z-Anatomy (CC BY-SA 4.0), which is built on BodyParts3D:
 *
 *   GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout -b PC-Version https://github.com/LluisV/z-anatomy /tmp/za
 *   git -C /tmp/za checkout HEAD -- Resources/Models/FBX/SkeletalSystem100.fbx Resources/Models/FBX/Joints100.fbx
 *   npm run model -- /tmp/za/Resources/Models/FBX male
 *   npm run model -- /tmp/za/Resources/Models/FBX female /path/to/3d-vh-f-united.glb   (see scripts/female.mjs)
 *
 * Output: public/models/skeleton-<sex>.glb (Draco) with one node per bone, named by the bone id in
 * content/bones (206), plus one merged, non-selectable context mesh (costal cartilages, teeth, intervertebral
 * discs); and src/data/model-<sex>.json (per-mesh centre, radius, triangles, origin).
 *
 * Each mesh is centred on its own bounding-box centre and the node carries that position, so bones can be moved
 * (exploded view, drag) by changing their node position only.
 *
 * Z-Anatomy units are cm with Y up, the body facing +Z and its left at +X; output is metres, feet at y = 0.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFbx, worldGeometry, cleanMesh, merge, bounds, writeGlb, meshoptReady } from './lib/mesh.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [fbxDir, sex = 'male', hraFile] = process.argv.slice(2)
if (!fbxDir || (sex === 'female' && !hraFile)) {
  console.error('usage: build-skeleton.mjs <z-anatomy FBX dir> [male | female <3d-vh-f-united.glb>]')
  process.exit(1)
}
await meshoptReady

/* ---------------- Z-Anatomy object name → bone id ---------------- */

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
const ord = (w) => ORD.indexOf(w.toLowerCase()) + 1
const SEG = ['proximal', 'middle', 'distal']

const SINGLE = {
  Frontal_bone: 'frontal_bone',
  Occipital_bone: 'occipital_bone',
  Sphenoid_bone: 'sphenoid_bone',
  Ethmoid_bone: 'ethmoid_bone',
  Vomer: 'vomer',
  Mandible: 'mandible',
  Hyoid_bone: 'hyoid_bone',
  'Atlas_(C1)': 'vertebra_c1',
  'Axis_(C2)': 'vertebra_c2',
  Sacrum: 'sacrum',
  Coccyx: 'coccyx',
  Manubrium_of_sternum: 'sternum',
  Body_of_sternum: 'sternum',
  Xiphoid_process: 'sternum',
}
const PAIRED = {
  Parietal_bone: 'parietal_bone',
  Temporal_bone: 'temporal_bone',
  Nasal_bone: 'nasal_bone',
  Lacrimal_bone: 'lacrimal_bone',
  Zygomatic_bone: 'zygomatic_bone',
  Maxilla: 'maxilla',
  Palatine_bone: 'palatine_bone',
  Inferior_nasal_concha_bone: 'inferior_nasal_concha',
  Malleus: 'malleus',
  Incus: 'incus',
  Stapes: 'stapes',
  Clavicle: 'clavicle',
  Scapula: 'scapula',
  Humerus: 'humerus',
  Radius: 'radius',
  Ulna: 'ulna',
  Scaphoid_bone: 'scaphoid',
  Lunate_bone: 'lunate',
  Triquetrum_bone: 'triquetrum',
  Pisiform_bone: 'pisiform',
  Trapezium_bone: 'trapezium',
  Trapezoid_bone: 'trapezoid',
  Capitate_bone: 'capitate',
  Hamate_bone: 'hamate',
  Hip_bone: 'hip_bone',
  Femur: 'femur',
  Patella: 'patella',
  Tibia: 'tibia',
  Fibula: 'fibula',
  Talus: 'talus',
  Calcaneus: 'calcaneus',
  Navicular_bone: 'navicular',
  Cuboid_bone: 'cuboid',
  Medial_cuneiform_bone: 'medial_cuneiform',
  Intermediate_cuneiform_bone: 'intermediate_cuneiform',
  Lateral_cuneiform_bone: 'lateral_cuneiform',
}

/** → { id, kind } or null (not part of the model). */
function classify(name) {
  if (SINGLE[name]) return { id: SINGLE[name], kind: 'bone' }
  let m
  if ((m = name.match(/^Vertebra_([CTL])(\d+)$/))) return { id: `vertebra_${m[1].toLowerCase()}${m[2]}`, kind: 'bone' }
  const side = name.endsWith('l') ? 'left' : name.endsWith('r') ? 'right' : null
  if (!side) return null
  const base = name.slice(0, -1)
  if (PAIRED[base]) return { id: `${PAIRED[base]}_${side}`, kind: 'bone' }
  if ((m = base.match(/^(\w+?)_rib$/)) && ord(m[1])) return { id: `rib_${ord(m[1])}_${side}`, kind: 'bone' }
  if ((m = base.match(/^(\w+?)_metacarpal_bone$/))) return { id: `metacarpal_${ord(m[1])}_${side}`, kind: 'bone' }
  if ((m = base.match(/^(\w+?)_metatarsal_bone$/))) return { id: `metatarsal_${ord(m[1])}_${side}`, kind: 'bone' }
  if ((m = base.match(/^(Proximal|Middle|Distal)_phalanx_of_(\w+?)_finger_of_(hand|foot)$/)))
    return { id: `${m[3]}_${m[1].toLowerCase()}_phalanx_${ord(m[2])}_${side}`, kind: 'bone' }
  if ((m = base.match(/^Costal_cartilage_of_(\w+?)_rib$/))) return { id: `ctx_costal_cartilage_${ord(m[1])}_${side}`, kind: 'context' }
  if (/^(Upper|Lower)_\w+$/.test(base) && /(incisor|canine|premolar|molar)/.test(base)) return { id: `ctx_tooth_${base.toLowerCase()}_${side}`, kind: 'context' }
  return null // landmarks, attachment areas, cartilages of nose and larynx, sesamoids of the foot (not among the 206)
}

/* ---------------- read ---------------- */

const byId = new Map()
const add = (c, geom, source) => {
  const e = byId.get(c.id) ?? { id: c.id, kind: c.kind, parts: [], sources: [] }
  e.parts.push(geom)
  e.sources.push(source)
  byId.set(c.id, e)
}

const skel = readFbx(join(fbxDir, 'SkeletalSystem100.fbx'))
skel.traverse((o) => {
  if (!o.isMesh || o.parent?.isMesh) return // bone meshes sit in groups; their children are landmarks
  const c = classify(o.name)
  if (!c) return
  // Bones keep detail up to ~5k triangles; the long ribs and scapula are the heaviest in the source.
  const geom = cleanMesh(worldGeometry(o), { maxTris: c.kind === 'bone' ? 5000 : 1500, error: c.kind === 'bone' ? 0.0015 : 0.004 })
  add(c, geom, o.name)
})
const joints = readFbx(join(fbxDir, 'Joints100.fbx'))
joints.traverse((o) => {
  let m
  if (!o.isMesh || !(m = o.name.match(/^Intervertebral_disc_([CTL]\d+)-([CTLS]\d+)$/))) return
  add({ id: `ctx_disc_${m[1].toLowerCase()}_${m[2].toLowerCase()}`, kind: 'context' }, cleanMesh(worldGeometry(o), { maxTris: 1200, error: 0.004 }), o.name)
})

const bones = [...byId.values()].filter((e) => e.kind === 'bone')
if (bones.length !== 206) {
  console.error(`expected 206 bones, found ${bones.length}`)
  process.exit(1)
}

/* ---------------- stand on the floor ---------------- */

let minY = Infinity
for (const e of byId.values()) for (const p of e.parts) for (let i = 1; i < p.pos.length; i += 3) minY = Math.min(minY, p.pos[i])
for (const e of byId.values()) for (const p of e.parts) for (let i = 1; i < p.pos.length; i += 3) p.pos[i] -= minY

/* ---------------- female: real Visible Human Female bones + fitted derived parts (see female.mjs) ---------------- */

if (sex === 'female') {
  const { feminize } = await import('./female.mjs')
  await feminize({ byId, approx: {}, hraFile, merge, bounds })
}

/* ---------------- write ---------------- */

// Context meshes (cartilage, discs, teeth) are never selected; they are merged per host bone and move with it
// (exploded view, drag): costal cartilage → its rib, teeth → maxilla / mandible, disc → the vertebra above.
function hostOf(id) {
  let m
  if ((m = id.match(/^ctx_costal_cartilage_(\d+)_(left|right)$/))) return `rib_${m[1]}_${m[2]}`
  if ((m = id.match(/^ctx_tooth_upper_.*_(left|right)$/))) return `maxilla_${m[1]}`
  if (id.startsWith('ctx_tooth_lower_')) return 'mandible'
  if ((m = id.match(/^ctx_disc_([ctl]\d+)_/))) return `vertebra_${m[1]}`
  throw new Error(`no host bone for ${id}`)
}
const ctx = [...byId.values()].filter((e) => e.kind === 'context')
for (const e of ctx) byId.delete(e.id)
const byHost = new Map()
for (const e of ctx) byHost.set(hostOf(e.id), [...(byHost.get(hostOf(e.id)) ?? []), e])
for (const [host, list] of byHost)
  byId.set(`ctx_on_${host}`, { id: `ctx_on_${host}`, kind: 'context', host, parts: list.flatMap((e) => e.parts), sources: list.flatMap((e) => e.sources), sourceLabel: list[0].sourceLabel })

const ZA = 'Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D'
const meshes = [...byId.values()]
  .sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'bone' ? -1 : 1))
  .map((e) => {
    const g = merge(e.parts)
    const { min, max } = bounds(g.pos)
    const center = min.map((v, k) => (v + max[k]) / 2)
    for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) g.pos[i + k] -= center[k]
    let r2 = 0
    for (let i = 0; i < g.pos.length; i += 3) r2 = Math.max(r2, g.pos[i] ** 2 + g.pos[i + 1] ** 2 + g.pos[i + 2] ** 2)
    const extras = { kind: e.kind, source: e.sourceLabel ?? `${ZA}: ${e.sources.join(', ')}` }
    if (e.origin) extras.origin = e.origin
    if (e.host) extras.host = e.host
    return { ...e, ...g, center, radius: Math.sqrt(r2), extras }
  })

const tmp = join(root, 'node_modules', '.tmp')
mkdirSync(tmp, { recursive: true })
const raw = join(tmp, `skeleton-${sex}-raw.glb`)
writeGlb(raw, meshes, 'atlas build-skeleton')
const tris = meshes.reduce((n, m) => n + m.idx.length / 3, 0)
console.log(`raw: ${meshes.filter((m) => m.kind === 'bone').length} bones + context, ${tris} triangles`)

const out = join(root, 'public', 'models', `skeleton-${sex}.glb`)
execFileSync(join(root, 'node_modules', '.bin', 'gltf-transform'), ['draco', raw, out, '--quantize-position', '12', '--quantize-normal', '8'], { stdio: 'inherit' })

const r4 = (v) => Math.round(v * 10000) / 10000
const manifest = {
  sex,
  source:
    sex === 'female'
      ? 'Visible Human Female via HuBMAP HRA v1.5 (CC BY 4.0) + Z-Anatomy (CC BY-SA 4.0), fitted'
      : 'Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D 4.0 (© DBCLS, CC BY 4.0)',
  triangles: tris,
  meshes: Object.fromEntries(
    meshes.map((m) => [m.id, { kind: m.kind, center: m.center.map(r4), radius: r4(m.radius), triangles: m.idx.length / 3, ...(m.origin ? { origin: m.origin } : {}) }]),
  ),
}
writeFileSync(join(root, 'src', 'data', `model-${sex}.json`), JSON.stringify(manifest, null, 1) + '\n')
console.log(`wrote ${out} and src/data/model-${sex}.json`)
