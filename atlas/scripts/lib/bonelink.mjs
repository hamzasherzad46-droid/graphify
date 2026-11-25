// Links bone names (and bone landmarks) in imported text to Atlas bone ids, for "tap a name to see it in 3D".
// Paired bones link to the left one. Inline items: string | { k, t, bone? } (see scripts/import-openstax.mjs).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const BONES = readdirSync(join(ROOT, 'content', 'bones')).map((f) => JSON.parse(readFileSync(join(ROOT, 'content', 'bones', f), 'utf8')))

/** Everyday words that also name bones but are not used as bone names in the text, or are too vague. */
const NEVER = new Set(['hammer', 'anvil', 'stirrup', 'innominate', 'pinky', 'cuneiform'])
/** "axis" is the C2 vertebra only in a sentence about the neck vertebrae ("the atlas and axis", "C2"), not in "the
 *  long axis" or "along a proximal-to-distal axis". */
const sentence = (before, after) => before.slice(before.search(/[^.!?]*$/)) + after.slice(0, after.search(/[.!?]|$/))
const AXIS_OK = (before, after) => !/\b(an?|around|along|about|single|second|long)\s+$/i.test(before) && /\b(atlas|C2|C1|dens|vertebra|cervical|atlantoaxial)\b/i.test(sentence(before, after).replace(/\baxis\b/gi, ''))

/** In the nervous system chapters "C1"–"L5" name spinal nerves or cord levels ("spinal nerves C4 through T1", "the T1
 *  chain ganglion"), so there they are linked only after the word vertebra ("vertebra T5"). */
const CODE_OK = (before, nerves) => !nerves || /\bvertebra[e]?\s+$/i.test(before)
/** "radius" is the bone, except in a paragraph about blood vessels and flow ("the radius of the blood vessel"). */
const RADIUS_OK = (para) => !/\b(vessels?|resistance|viscosity|lumen|arterioles?|blood flow|diameter)\b/i.test(para)

const plurals = (f) => {
  if (/ bone$/.test(f)) return [f + 's']
  if (/a$/.test(f)) return [f + 'e', f + 's']
  if (/us$/.test(f)) return [f.replace(/us$/, 'i')]
  if (/x$/.test(f)) return [f.replace(/x$/, 'ges')] // phalanx → phalanges (not linked: no single bone)
  return [f + 's']
}

export function linker(landmarks) {
  const vocab = new Map() // lower-case form → bone id
  const add = (form, id) => {
    const f = form.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (f.length < 4 || NEVER.has(f) || /\d/.test(f)) return
    if (!vocab.has(f)) vocab.set(f, id)
  }
  // Left before right, so paired names link to the left bone.
  const sorted = [...BONES].sort((a, b) => (a.side === 'right') - (b.side === 'right') || a.id.localeCompare(b.id))
  for (const b of sorted) {
    if (/phalanx/i.test(b.name)) continue // phalanges are named by finger/toe; the generic word has no single bone
    for (const f of [b.name, ...b.acceptedSpellings]) {
      add(f, b.id)
      if (!/vertebra/.test(f)) for (const p of plurals(f.toLowerCase())) add(p, b.id)
    }
  }
  const byName = new Map(sorted.map((b) => [b.name.toLowerCase(), b.id]))
  for (const [form, bone] of Object.entries(landmarks)) {
    const id = BONES.some((b) => b.id === bone) ? bone : byName.get(bone.toLowerCase())
    if (!id) throw new Error(`landmarks.json: unknown bone "${bone}" for "${form}"`)
    vocab.set(form.toLowerCase(), id)
  }
  const forms = [...vocab.keys()].sort((a, b) => b.length - a.length)
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s-]+')
  const re = new RegExp(`\\b(${forms.map(esc).join('|')}|[CTL](?:1[0-2]|[1-9]))\\b`, 'gi')
  const VERT = { C: [1, 7], T: [1, 12], L: [1, 5] }

  const stats = new Map()
  const contexts = []
  const unlinked = new Map()

  const idFor = (match, before, after) => {
    const m = match.match(/^([CTL])(\d+)$/)
    if (m) {
      // Vertebra codes are written in capitals ("C7", "T12"); "c7" in prose is not one.
      if (!CODE_OK(before, mode.nerves)) return null
      const [lo, hi] = VERT[m[1]]
      const n = Number(m[2])
      return n >= lo && n <= hi ? `vertebra_${m[1].toLowerCase()}${n}` : null
    }
    const key = match.toLowerCase().replace(/[\s-]+/g, ' ')
    if (key === 'axis' && !AXIS_OK(before, after)) return null
    if (key === 'radius' && !RADIUS_OK(para)) return null
    // Gray's calls the scaphoid of the hand the “navicular”: in the upper-limb chapter it is the scaphoid, not the foot's bone.
    if ((key === 'navicular' || key === 'navicular bone') && mode.hand) return 'scaphoid_left'
    if (key === 'atlas' || key === 'axis') contexts.push(`${before.slice(-30)}[${match}]${after.slice(0, 30)}`)
    return vocab.get(key) ?? null
  }

  /** Split a string into text and bone links. */
  const linkText = (s) => {
    const out = []
    let last = 0
    for (const m of s.matchAll(re)) {
      if (/^[ctl]\d/.test(m[0])) continue // lower-case codes are not vertebrae
      const id = idFor(m[0], s.slice(0, m.index), s.slice(m.index + m[0].length))
      if (!id) continue
      if (m.index > last) out.push(s.slice(last, m.index))
      out.push({ k: 'bone', t: m[0], bone: id })
      stats.set(id, (stats.get(id) ?? 0) + 1)
      last = m.index + m[0].length
    }
    if (last < s.length) out.push(s.slice(last))
    return out
  }

  /** A key term: linked if it is a bone or landmark, or names a structure of a bone ("perpendicular plate of the ethmoid bone"). */
  const linkTerm = (t) => {
    const whole = vocab.get(t.toLowerCase().replace(/[\s-]+/g, ' '))
    if (whole) return whole
    const parts = linkText(t).filter((x) => typeof x !== 'string')
    if (parts.length === 1) return parts[0].bone
    return null
  }

  // The whole paragraph being linked ("radius" depends on what it is about), and the chapter's conventions.
  let para = ''
  let mode = { nerves: false }
  const inline = (items) => {
    para = items.map((x) => (typeof x === 'string' ? x : x.t)).join('')
    return items.flatMap((x) => {
      if (typeof x === 'string') return linkText(x)
      if (x.k === 'term') {
        const bone = linkTerm(x.t)
        if (!bone) unlinked.set(x.t.toLowerCase(), (unlinked.get(x.t.toLowerCase()) ?? 0) + 1)
        return [bone ? { ...x, bone } : x]
      }
      return [x]
    })
  }

  const blocks = (list) =>
    list.map((b) => {
      if (b.t === 'p') return { ...b, inl: inline(b.inl) }
      if (b.t === 'list') return { ...b, items: b.items.map(inline) }
      if (b.t === 'fig') return { ...b, caption: inline(b.caption) }
      if (b.t === 'table') return { ...b, head: b.head.map((r) => r.map(inline)), rows: b.rows.map((r) => r.map(inline)) }
      if (b.t === 'note') return { ...b, blocks: blocks(b.blocks) }
      return b
    })

  const bonesIn = (list) => {
    const found = new Set()
    const walk = (x) => {
      if (Array.isArray(x)) x.forEach(walk)
      else if (x && typeof x === 'object') {
        if (x.bone) found.add(x.bone)
        Object.values(x).forEach(walk)
      }
    }
    walk(list)
    return [...found].sort()
  }

  const report = () => {
    console.log('\nLinks per bone:', [...stats].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '))
    console.log('\natlas/axis contexts:\n ' + contexts.join('\n '))
    console.log('\nUnlinked key terms:\n ' + [...unlinked.keys()].sort().join(' | '))
  }

  /** Set before linking a chapter: `nerves` for the nervous system chapters (see CODE_OK). */
  const setMode = (m) => (mode = { nerves: false, ...m })
  return { inline, inlines: (l) => l.map(inline), blocks, bonesIn, report, setMode }
}
