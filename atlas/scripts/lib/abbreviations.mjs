// "Every abbreviation is written out in full the first time it appears in each lesson." A lesson is a textbook
// section, an exam question, a flashcard or a bone's information. Used by the OpenStax importer (to write
// abbreviations out) and by the text check (to fail on any that are not). Gray's 1918 text is not changed.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const data = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'abbreviations.json'), 'utf8'))
const FULL = new Map(Object.entries({ ...data.openstax, ...data.atlas }))
const NOT = new Set(Object.keys(data.notAbbreviations))
/** Units, symbols and terms that are read as they are written (no full form is expected). */
const READ_AS_WRITTEN = new Set(['mmHg', 'mV', 'mL', 'dL', 'nm', 'kHz', 'Hz', 'pH', 'DNA', 'RNA', 'UV', 'ST'])

// Not followed by a subscript or superscript digit: "CO₂" is carbon dioxide, not an abbreviation.
export const ABBR = /(?<![\p{L}\d-])((?:[A-Z]{2,}|[A-Z][a-z]?[A-Z][A-Za-z]*)s?)(?![\p{L}\d₀-₉⁰-⁹-])/gu

/** The abbreviation without a plural s ("EPSPs" → "EPSP"), or null when it is not an abbreviation. */
function base(token) {
  if (NOT.has(token) || READ_AS_WRITTEN.has(token) || /^[IVXLC]+$/.test(token)) return null
  // A plural counts as its singular: "postsynaptic potentials (PSPs)" defines PSP.
  if (/[A-Z]s$/.test(token)) return token.slice(0, -1)
  return token
}

/** The full form, for a plural too ("excitatory postsynaptic potentials"). */
function fullFor(token) {
  if (FULL.has(token)) return FULL.get(token)
  const b = token.replace(/s$/, '')
  if (token !== b && FULL.has(b)) return FULL.get(b).replace(/(\w)$/, '$1s')
  return null
}

/**
 * Walk one lesson's text in reading order. `parts` is a list of { text, set? } (set is absent where the text cannot be
 * changed, such as a link). Each abbreviation's first appearance must be defined in place: "full form (ABBR)" or
 * "ABBR (full form)". With fix, an undefined first appearance in a changeable part is written out
 * ("the CNS" → "the central nervous system (CNS)"). Returns the abbreviations written out and those left undefined.
 */
export function firstUses(parts, { fix = false } = {}) {
  const seen = new Set()
  const written = []
  const undefinedFirst = []
  for (const [i, part] of parts.entries()) {
    let text = part.text
    let changed = false
    ABBR.lastIndex = 0
    for (let m; (m = ABBR.exec(text)); ) {
      const token = m[1]
      const b = base(token)
      if (!b || seen.has(b)) continue
      seen.add(b)
      const before = text.slice(0, m.index)
      const after = text.slice(m.index + token.length)
      // A chemical formula whose number is a separate subscript ("CO" then a subscript 2): not an abbreviation.
      if (after === '' && parts[i + 1]?.kind === 'sub') {
        seen.delete(b)
        continue
      }
      if (/\($/.test(before) || /^ \(/.test(after)) continue // defined here
      const full = fullFor(token)
      if (fix && part.set && full) {
        const sentenceStart = !/\S/.test(before) || /[.!?:]\s+$/.test(before)
        const shown = sentenceStart ? full[0].toUpperCase() + full.slice(1) : full
        text = `${before}${shown} (${token})${after}`
        ABBR.lastIndex = before.length + shown.length + token.length + 3
        written.push(token)
        changed = true
      } else undefinedFirst.push({ token, context: text.slice(Math.max(0, m.index - 50), m.index + token.length + 30), full })
    }
    if (changed) part.set(text)
  }
  return { written, undefined: undefinedFirst }
}

/** Keys that are not lesson text. */
const SKIP = new Set(['id', 'src', 'alt', 'label', 'bone', 'to', 'k', 'ref', 'source', 'check', 'changes', 'glossary', 'structureId', 'objective', 'reviewStatus', 'type', 'topic', 'level', 'frequency', 'articulations', 'acceptedSpellings', 'taCode', 'reviewer', 'lastUpdated', 'side', 'region', 'subregion', 'latin', 'name', 'notesQuote', 'frontView', 'elevation', 'num', 'chapter', 'module', 'uuid', 'url', 'commit', 'license'])

/** A lesson's text parts in reading order, each changeable in place (strings in rich text and plain fields). */
export function partsOf(value) {
  const parts = []
  const walk = (holder, key) => {
    const v = holder[key]
    if (typeof v === 'string') parts.push({ text: v, set: (t) => (holder[key] = t) })
    else if (Array.isArray(v)) v.forEach((_, k) => walk(v, k))
    else if (v && typeof v === 'object') {
      // A link or emphasis inside rich text: read, not changed.
      if (typeof v.t === 'string' && 'k' in v) return parts.push({ text: v.t, kind: v.k })
      for (const k of Object.keys(v)) if (!SKIP.has(k)) walk(v, k)
    }
  }
  walk({ root: value }, 'root')
  return parts
}

/** An OpenStax section in the order the reader shows it: objectives, key points, text, then the questions. */
export const sectionParts = (s) => partsOf({ objectives: s.objectives, keyPoints: s.keyPoints, blocks: s.blocks, quickCheck: s.quickCheck, review: s.review, critical: s.critical })
