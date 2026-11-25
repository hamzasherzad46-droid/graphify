/**
 * Structure lessons: one structure (a bone, for now) in nine layers. Layers 1–3 are shown first; 4–9 open under
 * "Go deeper".
 *   1 In one line · 2 Where · 3 Key features · 4 Form → function · 5 Relations · 6 Development · 7 Variations ·
 *   8 Clinical reasoning · 9 Tutorial questions
 * Then a three-question check.
 *
 * Content: content/structures/<id>.json. Every statement carries its sources: OpenStax A&P 2e paragraphs
 * ("<section>#<paragraph id>"), an OpenStax glossary entry ("glossary:<term>"), and/or `check`, saying exactly what
 * still needs an approved source. A statement with `check` shows a dagger (†) and the lesson stays a draft.
 */
import type { Fact } from './layered'
import { BONE_BY_ID } from '../data/bones'

export type { Fact }

export interface Named extends Fact {
  name: string
}
export interface Relation extends Named {
  /** muscle, nerve, artery, joint, ligament … */
  kind: string
}
export interface ClinicalCase {
  injury: string
  damaged: string
  cannotDo: string
  why: string
  src: string[]
  check?: string
}
export type TutorialKind = 'explain' | 'compare' | 'predict'
export interface Tutorial {
  kind: TutorialKind
  q: string
  /** The points a model answer makes, in order. */
  model: string[]
  src: string[]
  check?: string
}
export interface CheckQuestion {
  stem: string
  options: string[]
  answer: number
  why: string
  src: string[]
}

export interface Structure {
  id: string
  /** The Atlas bone for "See in 3D" and the matching flashcards and exam questions. */
  bone: string
  topic: string
  source: string
  reviewStatus: 'draft' | 'reviewed'
  oneLine: { main: Fact; simpler: Fact; deeper: Fact }
  where: { facts: Fact[]; simpler: Fact; deeper: Fact }
  features: { items: Named[]; simpler: Fact; deeper: Fact }
  formFunction: { facts: Fact[]; simpler: Fact }
  relations: { items: Relation[]; simpler: Fact }
  development: { facts: Fact[] }
  variations: { facts: Fact[] }
  clinical: { items: ClinicalCase[] }
  tutorial: { items: Tutorial[] }
  check: CheckQuestion[]
}

const files = import.meta.glob<Structure>('../../content/structures/*.json', {
  import: 'default',
  eager: true,
})
export const STRUCTURES: Structure[] = Object.values(files).sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
export const structureById = (id: string) => STRUCTURES.find((s) => s.id === id)
export const structuresFor = (topic: string) => STRUCTURES.filter((s) => s.topic === topic)
export const structuresForBone = (bone: string) => STRUCTURES.filter((s) => s.bone === bone)

/** The structure's name, as the bone database writes it (one source of truth). */
export function nameOf(s: Pick<Structure, 'bone'>): string {
  return BONE_BY_ID.get(s.bone)?.name ?? s.bone
}

export const TUTORIAL_NAME: Record<TutorialKind, string> = {
  explain: 'Explain',
  compare: 'Compare',
  predict: 'Predict',
}

/** Every statement in a lesson, in reading order, as plain facts (for checks and the reviewer's list). */
export function factsOf(s: Structure): Fact[] {
  const facts: Fact[] = [
    s.oneLine.main,
    s.oneLine.simpler,
    s.oneLine.deeper,
    ...s.where.facts,
    s.where.simpler,
    s.where.deeper,
    ...s.features.items,
    s.features.simpler,
    s.features.deeper,
    ...s.formFunction.facts,
    s.formFunction.simpler,
    ...s.relations.items,
    s.relations.simpler,
    ...s.development.facts,
    ...s.variations.facts,
  ]
  for (const c of s.clinical.items)
    facts.push({
      t: `${c.injury} ${c.damaged} ${c.cannotDo} ${c.why}`,
      src: c.src,
      check: c.check,
    })
  for (const t of s.tutorial.items) facts.push({ t: [t.q, ...t.model].join(' '), src: t.src, check: t.check })
  for (const q of s.check) facts.push({ t: `${q.stem} ${q.options[q.answer]}. ${q.why}`, src: q.src })
  return facts
}

/** What still needs an approved source in this lesson (empty when every statement is sourced). */
export const needsReview = (s: Structure): string[] => [...new Set(factsOf(s).flatMap((f) => (f.check ? [f.check] : [])))]

/** Paragraph ids for highlights and notes ('st:<id>' documents), id → plain text, in reading order. */
export function structureParagraphs(s: Structure): Map<string, string> {
  const out = new Map<string, string>()
  const put = (k: string, f: { t: string }) => out.set(`${s.id}-${k}`, f.t)
  put('one', s.oneLine.main)
  s.where.facts.forEach((f, k) => put(`where-${k}`, f))
  s.features.items.forEach((f, k) => out.set(`${s.id}-feat-${k}`, `${f.name}: ${f.t}`))
  s.formFunction.facts.forEach((f, k) => put(`ff-${k}`, f))
  s.relations.items.forEach((f, k) => out.set(`${s.id}-rel-${k}`, `${f.name}: ${f.t}`))
  s.development.facts.forEach((f, k) => put(`dev-${k}`, f))
  s.variations.facts.forEach((f, k) => put(`var-${k}`, f))
  s.clinical.items.forEach((c, k) => out.set(`${s.id}-clin-${k}`, `${c.injury} ${c.damaged} ${c.cannotDo} ${c.why}`))
  s.tutorial.items.forEach((t, k) => out.set(`${s.id}-tut-${k}`, `${t.q} ${t.model.join(' ')}`))
  return out
}

/* ── Glossary: tappable definitions ─────────────────────────────────────────────────────────────────────────── */

export interface GlossaryEntry {
  term: string
  meaning: string
  /** OpenStax section number, e.g. "8.2". */
  section: string
}

/** Everyday words that need no pop-up, even though the OpenStax glossary defines them. */
const EVERYDAY = new Set(
  'arm,base,blood,body,bone,brain,deep,development,growth,hand,joint,nerve,artery,process,projection,ribs,trunk,forearm,fracture,x-ray,skull,tendon,ligament,muscle,head,neck,cranial'.split(','),
)

let glossary: Promise<Map<string, GlossaryEntry>> | null = null
/** The OpenStax glossary (loaded on first use: it is large). */
export function loadGlossary(): Promise<Map<string, GlossaryEntry>> {
  glossary ??= import('../../data/glossary.json').then((m) => {
    const terms = (m.default as { terms: Record<string, GlossaryEntry> }).terms
    return new Map(Object.entries(terms).filter(([k]) => !EVERYDAY.has(k)))
  })
  return glossary
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A matcher for glossary terms in running text, longest first ("glenoid cavity" before "glenoid"). */
export function termMatcher(terms: Iterable<string>): RegExp {
  const list = [...terms].sort((a, b) => b.length - a.length).map(escape)
  return new RegExp(`\\b(${list.join('|')})\\b`, 'gi')
}

export type Piece = string | { term: string; text: string }

/**
 * Split text into plain pieces and glossary terms. `seen` holds terms already marked in this lesson: each term is
 * marked the first time only, so the page is not covered in links.
 */
export function splitTerms(text: string, re: RegExp, seen: Set<string>): Piece[] {
  const out: Piece[] = []
  let last = 0
  re.lastIndex = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const term = m[1].toLowerCase()
    if (seen.has(term)) continue
    seen.add(term)
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ term, text: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Say a term aloud, in British English, where the device can. */
export function pronounce(term: string): boolean {
  if (typeof speechSynthesis === 'undefined') return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(term)
  u.lang = 'en-GB'
  u.rate = 0.85
  const voice = speechSynthesis.getVoices().find((v) => v.lang === 'en-GB')
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
  return true
}
