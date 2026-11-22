/**
 * Builds the adult female skeleton (used by build-skeleton.mjs with `female`).
 *
 * Real female bones, from the NLM Visible Human Female, as segmented in the HuBMAP Human Reference Atlas
 * "3D Reference Organ Set for Female v1.5" (CC BY 4.0, https://doi.org/10.48539/HBM352.BTSQ.586):
 *   C1–C7, T1–T12, L1–L5, sacrum, coccyx, hip bones (ilium + ischium + pubis, compact bone), femur, patella,
 *   tibia, fibula.
 *
 *   The donor has six lumbar vertebrae (a normal variant). Atlas teaches the standard five, so the top lumbar
 *   vertebra is left out and the spine above it is lowered onto the next one: HRA L2–L6 become L1–L5.
 *
 * Everything else (skull, ossicles, hyoid, ribs, sternum, upper limbs, hands, feet, and the context meshes)
 * is derived from the BodyParts3D male model and fitted to the female bones:
 *   - thorax, shoulder girdle and upper limbs: one similarity transform matching the male thoracic
 *     vertebrae to the female ones (so rib heads meet the female vertebrae);
 *   - head: scaled by the same factor and moved onto the female atlas (C1), kept upright;
 *   - feet: per side, a similarity matching the male distal tibia and fibula to the female ones;
 *   - intervertebral discs: each moved, turned and scaled to sit between its two female vertebrae.
 *   The skull also gets the typical female adjustments, as small smooth deformations (2–3 mm):
 *   smaller superciliary arches and glabella, smaller mastoid processes, a smaller external occipital
 *   protuberance, and less flared gonial angles.
 *
 * Coordinates: metres, Y up, body faces +Z, body's left is +X (HRA uses the same axes).
 */
import { NodeIO } from '@gltf-transform/core'
import { MeshoptSimplifier } from 'meshoptimizer'

const HRA = 'HuBMAP HRA 3D Reference Organ Set for Female v1.5 (Visible Human Female), CC BY 4.0'

/* ---------------- small vector / matrix helpers ---------------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a) => Math.hypot(a[0], a[1], a[2])
const norm = (a) => scale(a, 1 / (len(a) || 1))

/** Quaternion [w,x,y,z] → 3×3 rotation (row-major). */
function quatToMat([w, x, y, z]) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ]
}
const mulMV = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)]
const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

/** Rotation taking unit vector a to unit vector b (shortest arc). */
function rotationBetween(a, b) {
  const c = dot(a, b)
  if (c > 0.999999) return IDENTITY
  const ax = norm(cross(a, b))
  const half = Math.acos(Math.max(-1, Math.min(1, c))) / 2
  const s = Math.sin(half)
  return quatToMat([Math.cos(half), ax[0] * s, ax[1] * s, ax[2] * s])
}

/** Largest eigenvector of a symmetric 4×4 matrix (Jacobi). */
function maxEigenvector(A) {
  const a = A.map((r) => [...r])
  const v = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) off += a[p][q] ** 2
    if (off < 1e-22) break
    for (let p = 0; p < 4; p++)
      for (let q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-30) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < 4; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - s * akq
          a[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - s * aqk
          a[q][k] = s * apk + c * aqk
        }
        for (let k = 0; k < 4; k++) {
          const vkp = v[k][p]
          const vkq = v[k][q]
          v[k][p] = c * vkp - s * vkq
          v[k][q] = s * vkp + c * vkq
        }
      }
  }
  let best = 0
  for (let i = 1; i < 4; i++) if (a[i][i] > a[best][best]) best = i
  return [0, 1, 2, 3].map((k) => v[k][best])
}

/**
 * Similarity transform (uniform scale s, rotation R, translation t) that best maps points `from` onto `to`
 * (Horn's quaternion method).
 */
function similarity(from, to) {
  const n = from.length
  const ca = scale(from.reduce(add, [0, 0, 0]), 1 / n)
  const cb = scale(to.reduce(add, [0, 0, 0]), 1 / n)
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    const a = sub(from[i], ca)
    const b = sub(to[i], cb)
    sa += dot(a, a)
    sb += dot(b, b)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += a[r] * b[c]
  }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ]
  const R = quatToMat(maxEigenvector(N))
  const s = Math.sqrt(sb / sa)
  const t = sub(cb, scale(mulMV(R, ca), s))
  return { s, R, t }
}

const angleOf = (R) => (Math.acos(Math.max(-1, Math.min(1, (R[0][0] + R[1][1] + R[2][2] - 1) / 2))) * 180) / Math.PI

/** Applies p → s·R·p + t to a part's positions and R to its normals, in place. */
function transformPart(part, { s, R, t }) {
  const { pos, nrm } = part
  for (let i = 0; i < pos.length; i += 3) {
    const p = mulMV(R, [pos[i], pos[i + 1], pos[i + 2]])
    pos[i] = p[0] * s + t[0]
    pos[i + 1] = p[1] * s + t[1]
    pos[i + 2] = p[2] * s + t[2]
    const q = mulMV(R, [nrm[i], nrm[i + 1], nrm[i + 2]])
    nrm[i] = q[0]
    nrm[i + 1] = q[1]
    nrm[i + 2] = q[2]
  }
}
const translate = (t) => ({ s: 1, R: IDENTITY, t })

/** Smooth, area-weighted vertex normals from the triangles. */
function computeNormals(pos, idx) {
  const nrm = new Float32Array(pos.length)
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3
    const b = idx[i + 1] * 3
    const c = idx[i + 2] * 3
    const u = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]]
    const v = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]]
    const n = cross(u, v)
    for (const k of [a, b, c]) {
      nrm[k] += n[0]
      nrm[k + 1] += n[1]
      nrm[k + 2] += n[2]
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

/* ---------------- read and clean up the HRA female meshes ---------------- */

async function readHra(file) {
  const doc = await new NodeIO().read(file)
  const nodes = new Map(doc.getRoot().listNodes().map((n) => [n.getName(), n]))
  await MeshoptSimplifier.ready

  /** World-space, welded, outward-facing, simplified geometry of one HRA node (its own mesh only). */
  return function get(name, targetTris) {
    const node = nodes.get(name)
    if (!node?.getMesh()) throw new Error(`HRA node ${name} not found`)
    const M = node.getWorldMatrix()
    const posAll = []
    const idxAll = []
    for (const prim of node.getMesh().listPrimitives()) {
      const P = prim.getAttribute('POSITION')
      const base = posAll.length / 3
      const el = [0, 0, 0]
      for (let i = 0; i < P.getCount(); i++) {
        P.getElement(i, el)
        posAll.push(
          M[0] * el[0] + M[4] * el[1] + M[8] * el[2] + M[12],
          M[1] * el[0] + M[5] * el[1] + M[9] * el[2] + M[13],
          M[2] * el[0] + M[6] * el[1] + M[10] * el[2] + M[14],
        )
      }
      const I = prim.getIndices()
      if (I) for (let i = 0; i < I.getCount(); i++) idxAll.push(I.getScalar(i) + base)
      else for (let i = 0; i < P.getCount(); i++) idxAll.push(i + base)
    }
    let pos = Float32Array.from(posAll)
    let idx = Uint32Array.from(idxAll)
    // Weld duplicate positions so the simplifier sees one surface.
    const remap = MeshoptSimplifier.generatePositionRemap(pos, 3)
    idx = idx.map((i) => remap[i])
    // Outward winding: a positive enclosed volume.
    let vol = 0
    for (let i = 0; i < idx.length; i += 3) {
      const a = [pos[idx[i] * 3], pos[idx[i] * 3 + 1], pos[idx[i] * 3 + 2]]
      const b = [pos[idx[i + 1] * 3], pos[idx[i + 1] * 3 + 1], pos[idx[i + 1] * 3 + 2]]
      const c = [pos[idx[i + 2] * 3], pos[idx[i + 2] * 3 + 1], pos[idx[i + 2] * 3 + 2]]
      vol += dot(a, cross(b, c))
    }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]
    if (targetTris && idx.length / 3 > targetTris) {
      const [simplified] = MeshoptSimplifier.simplify(idx, pos, 3, targetTris * 3, 0.02)
      idx = simplified
    }
    // compactMesh rewrites idx in place and returns the old → new vertex map.
    const [remapOld, unique] = MeshoptSimplifier.compactMesh(idx)
    const out = new Float32Array(unique * 3)
    for (let v = 0; v < remapOld.length; v++) if (remapOld[v] !== 0xffffffff) out.set(pos.subarray(v * 3, v * 3 + 3), remapOld[v] * 3)
    pos = out
    return { pos, nrm: computeNormals(pos, idx), idx }
  }
}

/* ---------------- female skull adjustments (applied to the male skull, before fitting) ---------------- */

function vertices(part, fn) {
  const { pos } = part
  for (let i = 0; i < pos.length; i += 3) {
    const out = fn([pos[i], pos[i + 1], pos[i + 2]])
    if (out) {
      pos[i] = out[0]
      pos[i + 1] = out[1]
      pos[i + 2] = out[2]
    }
  }
}
function allVerts(entry) {
  const vs = []
  for (const p of entry.parts) for (let i = 0; i < p.pos.length; i += 3) vs.push([p.pos[i], p.pos[i + 1], p.pos[i + 2]])
  return vs
}
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
/** Moves vertices near `center` (radius r) by `offset`, with a smooth falloff. */
function bump(entry, center, r, offset) {
  for (const part of entry.parts)
    vertices(part, (p) => {
      const w = smooth(1 - len(sub(p, center)) / r)
      return w > 0 ? add(p, scale(offset, w)) : null
    })
}
/** Pulls vertices near `center` towards `pivot` by `amount` (0–1), with a smooth falloff. */
function shrink(entry, center, r, pivot, amount) {
  for (const part of entry.parts)
    vertices(part, (p) => {
      const w = smooth(1 - len(sub(p, center)) / r) * amount
      return w > 0 ? add(p, scale(sub(pivot, p), w)) : null
    })
}

function feminizeSkull(byId, log) {
  const frontal = byId.get('frontal_bone')
  const fv = allVerts(frontal)
  const fMinY = Math.min(...fv.map((v) => v[1]))
  const fMaxY = Math.max(...fv.map((v) => v[1]))
  // Glabella: the most anterior point of the lower third of the frontal bone.
  const low = fv.filter((v) => v[1] < fMinY + (fMaxY - fMinY) * 0.35 && Math.abs(v[0]) < 0.01)
  const glabella = low.reduce((a, b) => (b[2] > a[2] ? b : a))
  // Superciliary arches: smaller, flatter brow ridge (female). Centred slightly above the glabella.
  for (const dx of [-0.022, 0, 0.022]) bump(frontal, [glabella[0] + dx, glabella[1] + 0.006, glabella[2]], 0.022, [0, 0, -0.0022])
  log(`  skull: glabella at ${glabella.map((v) => v.toFixed(3))}, brow ridge reduced`)

  // Mastoid processes: smaller (female).
  for (const side of ['left', 'right']) {
    const t = byId.get(`temporal_bone_${side}`)
    const tv = allVerts(t)
    const cz = tv.reduce((s, v) => s + v[2], 0) / tv.length
    const tip = tv.filter((v) => v[2] < cz).reduce((a, b) => (b[1] < a[1] ? b : a))
    shrink(t, tip, 0.016, add(tip, [0, 0.012, 0]), 0.3)
  }
  // External occipital protuberance: less pronounced (female).
  const occ = byId.get('occipital_bone')
  const ov = allVerts(occ)
  const oMinY = Math.min(...ov.map((v) => v[1]))
  const oMaxY = Math.max(...ov.map((v) => v[1]))
  const inion = ov.filter((v) => v[1] > oMinY + (oMaxY - oMinY) * 0.3 && Math.abs(v[0]) < 0.012).reduce((a, b) => (b[2] < a[2] ? b : a))
  bump(occ, inion, 0.02, [0, 0, 0.002])
  // Gonial angles: less flared (female).
  const mand = byId.get('mandible')
  const mv = allVerts(mand)
  const mMinY = Math.min(...mv.map((v) => v[1]))
  const mcz = mv.reduce((s, v) => s + v[2], 0) / mv.length
  for (const sgn of [1, -1]) {
    const gonion = mv.filter((v) => v[2] < mcz && v[1] < mMinY + 0.03 && v[0] * sgn > 0).reduce((a, b) => (b[0] * sgn > a[0] * sgn ? b : a))
    bump(mand, gonion, 0.022, [-sgn * 0.0022, 0.001, 0])
  }
  for (const part of mand.parts) part.nrm = computeNormals(part.pos, part.idx)
  for (const id of ['frontal_bone', 'occipital_bone', 'temporal_bone_left', 'temporal_bone_right'])
    for (const part of byId.get(id).parts) part.nrm = computeNormals(part.pos, part.idx)
}

/* ---------------- groups ---------------- */

const SKULL = [
  'frontal_bone', 'occipital_bone', 'sphenoid_bone', 'ethmoid_bone', 'vomer', 'mandible', 'hyoid_bone',
  ...['parietal_bone', 'temporal_bone', 'nasal_bone', 'zygomatic_bone', 'maxilla', 'palatine_bone', 'lacrimal_bone',
    'inferior_nasal_concha', 'malleus', 'incus', 'stapes'].flatMap((b) => [`${b}_left`, `${b}_right`]),
]
const isHead = (id) => SKULL.includes(id) || id.startsWith('ctx_tooth_')
const isThoraxOrArm = (id) =>
  /^(rib_|sternum$|clavicle_|scapula_|humerus_|radius_|ulna_|scaphoid_|lunate_|triquetrum_|pisiform_|trapezium_|trapezoid_|capitate_|hamate_|metacarpal_|hand_|ctx_costal_cartilage_)/.test(id)
const FOOT = /^(talus_|calcaneus_|navicular_|cuboid_|medial_cuneiform_|intermediate_cuneiform_|lateral_cuneiform_|metatarsal_|foot_)/

/* ---------------- main ---------------- */

/**
 * Turns the male `byId` (BodyParts3D bones + generated coccyx/ossicles + context meshes) into the female
 * skeleton, in place. Sets `origin` and `sourceLabel` on every entry.
 */
export async function feminize({ byId, approx, hraFile, merge, bounds, log = console.log }) {
  const get = await readHra(hraFile)
  const center = (parts) => {
    const { min, max } = bounds(merge(parts).pos)
    return min.map((v, k) => (v + max[k]) / 2)
  }
  const maleCenter = (id) => center(byId.get(id).parts)

  /* 1. Real female bones. */
  const real = new Map() // id → { parts, sources }
  const put = (id, names, tris) => real.set(id, { parts: names.map((n) => get(n, tris)), sources: names })
  for (let i = 1; i <= 7; i++) put(`vertebra_c${i}`, [`VH_F_cervical_vertebra_${i}`], 2600)
  for (let i = 1; i <= 12; i++) put(`vertebra_t${i}`, [`VH_F_thoracic_vertebra_${i}`], 2600)
  for (let i = 1; i <= 5; i++) put(`vertebra_l${i}`, [`VH_F_lumbar_vertebra_${i + 1}`], 2800) // HRA L2–L6 → L1–L5
  put('sacrum', ['VH_F_sacrum'], 6000)
  put('coccyx', ['VH_F_coccyx'], 1500)
  for (const [side, S] of [['left', 'L'], ['right', 'R']]) {
    real.set(`hip_bone_${side}`, {
      parts: [get(`VH_F_ilium_compact_bone_${S}`, 3600), get(`VH_F_ischium_compact_bone_${S}`, 1700), get(`VH_F_pubis_compact_bone_${S}`, 1700)],
      sources: [`VH_F_ilium_compact_bone_${S}`, `VH_F_ischium_compact_bone_${S}`, `VH_F_pubis_compact_bone_${S}`],
    })
    for (const b of ['femur', 'tibia', 'fibula', 'patella']) put(`${b}_${side}`, [`VH_F_${b}_${S}`], b === 'femur' ? 3600 : 3000)
  }

  // Fold the sixth lumbar vertebra away: everything above HRA L2 drops onto it.
  const hraL1 = center([get('VH_F_lumbar_vertebra_1')])
  const hraL2 = real.get('vertebra_l1').parts
  const fold = sub(center(hraL2), hraL1)
  for (const [id, e] of real) if (/^vertebra_[ct]/.test(id)) for (const p of e.parts) transformPart(p, translate(fold))
  log(`  folded HRA L1 away: spine above lowered by ${(len(fold) * 1000).toFixed(1)} mm`)
  const femaleCenter = (id) => center(real.get(id).parts)

  /* 2. Female skull adjustments, on the male skull, before it is fitted. */
  feminizeSkull(byId, log)

  /* 3. Fit the derived parts. */
  const T = [...Array(12)].map((_, i) => `vertebra_t${i + 1}`)
  // Rotation and position from the best fit of the thoracic vertebrae. Scale from the real long bones: the
  // female/male ratio of femur and tibia lengths (posture changes the spine's shape, not the leg bones' length).
  const height = (parts) => {
    const { min, max } = bounds(merge(parts).pos)
    return max[1] - min[1]
  }
  const legRatio =
    ['femur_left', 'femur_right', 'tibia_left', 'tibia_right'].reduce((sum, id) => sum + height(real.get(id).parts) / height(byId.get(id).parts), 0) / 4
  const thoraxFit = similarity(T.map(maleCenter), T.map(femaleCenter))
  const cm = scale(T.map(maleCenter).reduce(add, [0, 0, 0]), 1 / 12)
  const cf = scale(T.map(femaleCenter).reduce(add, [0, 0, 0]), 1 / 12)
  const thorax = { s: legRatio, R: thoraxFit.R, t: sub(cf, scale(mulMV(thoraxFit.R, cm), legRatio)) }
  // Female heads are relatively larger than female bodies (about 0.93–0.95 of male head size vs ~0.92 stature).
  const headScale = Math.min(1, legRatio * 1.025)
  log(`  long-bone ratio ${legRatio.toFixed(3)} → thorax/limbs ×${legRatio.toFixed(3)}, head ×${headScale.toFixed(3)}; thorax rotation ${angleOf(thorax.R).toFixed(1)}°`)
  const head = { s: headScale, R: IDENTITY, t: sub(femaleCenter('vertebra_c1'), scale(maleCenter('vertebra_c1'), headScale)) }

  const feet = {}
  for (const side of ['left', 'right']) {
    const lowest = (parts) => {
      let best = null
      for (const p of parts) for (let i = 0; i < p.pos.length; i += 3) if (!best || p.pos[i + 1] < best[1]) best = [p.pos[i], p.pos[i + 1], p.pos[i + 2]]
      return best
    }
    const m = [lowest(byId.get(`tibia_${side}`).parts), lowest(byId.get(`fibula_${side}`).parts), maleCenter(`tibia_${side}`), maleCenter(`fibula_${side}`)]
    const f = [lowest(real.get(`tibia_${side}`).parts), lowest(real.get(`fibula_${side}`).parts), femaleCenter(`tibia_${side}`), femaleCenter(`fibula_${side}`)]
    feet[side] = similarity(m, f)
    log(`  ${side} foot fit: scale ${feet[side].s.toFixed(3)}, rotation ${angleOf(feet[side].R).toFixed(1)}°`)
  }

  // Intervertebral discs: between the two male vertebrae nearest to each disc.
  const spineIds = [...Array(7)].map((_, i) => `vertebra_c${i + 1}`).concat(T, [...Array(5)].map((_, i) => `vertebra_l${i + 1}`), ['sacrum'])
  const maleSpine = spineIds.map((id) => ({ id, c: maleCenter(id) }))
  const discFit = (discCenter) => {
    const [a, b] = [...maleSpine].sort((x, y) => len(sub(x.c, discCenter)) - len(sub(y.c, discCenter)))
    const fa = femaleCenter(a.id)
    const fb = femaleCenter(b.id)
    const R = rotationBetween(norm(sub(b.c, a.c)), norm(sub(fb, fa)))
    const s = len(sub(fb, fa)) / len(sub(b.c, a.c))
    const mid = scale(add(a.c, b.c), 0.5)
    const fmid = scale(add(fa, fb), 0.5)
    return { s, R, t: sub(fmid, scale(mulMV(R, mid), s)) }
  }

  for (const [id, e] of byId) {
    let fit = null
    if (real.has(id)) continue
    if (isHead(id)) fit = head
    else if (isThoraxOrArm(id)) fit = thorax
    else if (FOOT.test(id)) fit = feet[id.endsWith('_left') ? 'left' : 'right']
    else if (id.startsWith('ctx_disc_')) fit = discFit(center(e.parts))
    if (!fit) throw new Error(`female build: no rule for ${id}`)
    for (const p of e.parts) transformPart(p, fit)
    e.origin = 'derived'
    e.sourceLabel = `Derived from BodyParts3D 4.0 (male), fitted to the female skeleton${isHead(id) && !id.startsWith('ctx_') ? ' with female skull adjustments' : ''}`
  }
  for (const [id, r] of real) {
    byId.set(id, { id, kind: 'bone', parts: r.parts, sources: [], origin: 'scan', sourceLabel: `${HRA}: ${r.sources.join(', ')}` })
    delete approx[id]
  }

  /* 4. Stand on the floor, centred on the midline. */
  let minY = Infinity
  for (const e of byId.values()) for (const p of e.parts) for (let i = 1; i < p.pos.length; i += 3) minY = Math.min(minY, p.pos[i])
  const mid = femaleCenter('sacrum')
  const shift = [-mid[0], -minY, 0]
  for (const e of byId.values()) for (const p of e.parts) transformPart(p, translate(shift))
  let maxY = -Infinity
  for (const e of byId.values()) for (const p of e.parts) for (let i = 1; i < p.pos.length; i += 3) maxY = Math.max(maxY, p.pos[i])
  log(`  female skeleton height: ${(maxY * 100).toFixed(1)} cm`)
}
