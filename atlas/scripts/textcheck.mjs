// Atlas text check: spelling, British English, consistency and grammar, over every piece of text the app shows.
//
//   node scripts/textcheck.mjs            spelling, British spelling, consistency, fast grammar rules (every build)
//   node scripts/textcheck.mjs --grammar  also LanguageTool (en-GB), offline; slower (see tools/languagetool)
//
// Text checked: content/ (bones, regions, topics, landmarks, exam questions, flashcards, the OpenStax textbook, Gray's
// classic reference), the interface (on-screen text, button and aria labels, placeholders, messages in src/), the
// Notes to Exam server's prompts and messages (server/src), and the page title.
//
// Fails (exit 1) on: a word in no dictionary, an American spelling, a broken spelling decision (data/dictionary.json),
// or a name written two ways. Writes docs/text-report.md every run.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { setKeep, setKnownWords, speller, toBritish } from './lib/british.mjs'
import { derivedFrom, sourceNames, sourceOf } from './lib/sources.mjs'
import { firstUses, partsOf, sectionParts } from './lib/abbreviations.mjs'

const ROOT = join(import.meta.dirname, '..')
const GRAMMAR = process.argv.includes('--grammar')
const dict = JSON.parse(readFileSync(join(ROOT, 'data', 'dictionary.json'), 'utf8'))
const extraWords = [...dict.terminologia.words, ...Object.keys(dict.approved), ...Object.keys(dict.proposed), ...Object.keys(dict.keep ?? {})]
setKnownWords(extraWords)
setKeep(Object.keys(dict.keep ?? {}))
const extra = new Set(extraWords.map((w) => w.toLowerCase()))
/** Words known without asking anyone: the en-GB base, Terminologia Anatomica, approved words and kept spellings. */
const settled = new Set([...dict.terminologia.words, ...Object.keys(dict.approved), ...Object.keys(dict.keep ?? {})].map((w) => w.toLowerCase()))
const proposed = new Set(Object.keys(dict.proposed).map((w) => w.toLowerCase()))
const historical = new Set(Object.keys(dict.historical ?? {}).map((w) => w.toLowerCase()))
/** Proper names are kept as their owners spell them: removed from the text before the word checks. */
const NAMES = Object.keys(dict.names ?? {}).sort((a, b) => b.length - a.length).map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
const withoutNames = (s) => NAMES.reduce((t, re) => t.replace(re, ' '), s)

/* ── Collect ────────────────────────────────────────────────────────────────────────────────────────────────── */

/** { text, where, source: 'atlas' | 'openstax' | 'grays' | 'ui' | 'server', alt?: true } */
const texts = []
const files = (dir, ext) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : []
  })

/** JSON keys whose values are identifiers, codes or links, not text. */
const SKIP_KEYS = new Set(['description', 'id', 'k', 'bone', 'src', 'to', 'reviewStatus', 'type', 'topic', 'side', 'reviewer', 'lastUpdated', 'kind', 'num', 'level', 'frequency', 'license', 'commit', 'module', 'uuid', 'url', 'slug', 'structureId', 'reportEmail', 'contentVersion', 'taCode', 'section', 'articulations', 'fetched', 'wikidata', 'regions', 'region', 'subregion', 'group', 'set', 'bones', 'chapter', 'mode', 'dir'])
const looksLikeId = (s) => /^[a-z0-9]+([_.:/#-][a-z0-9]+)+$/i.test(s) || /^https?:/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s) || /^[a-z0-9_]+$/.test(s) && s.includes('_')

const isInline = (v) => Array.isArray(v) && v.length > 1 && v.some((x) => x && typeof x === 'object') && v.every((x) => typeof x === 'string' || (x && typeof x === 'object' && typeof x.t === 'string' && 'k' in x))

function walkJson(value, where, source, key = '', alt = false) {
  if (typeof value === 'string') {
    if (!SKIP_KEYS.has(key) && !looksLikeId(value) && /[A-Za-z]{2}/.test(value)) texts.push({ text: value, where, source, alt })
  } else if (isInline(value)) {
    // Rich text (a paragraph split by links): checked as one string.
    const text = value.map((x) => (typeof x === 'string' ? x : x.t)).join('')
    if (/[A-Za-z]{2}/.test(text)) texts.push({ text, where, source, alt })
  } else if (Array.isArray(value)) value.forEach((v, k) => walkJson(v, `${where}[${k}]`, source, key, alt))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue
      walkJson(v, where ? `${where}.${k}` : k, source, k, alt || k === 'acceptedSpellings')
    }
}

for (const f of files(join(ROOT, 'content'), ['.json'])) {
  const rel = relative(ROOT, f)
  const data = JSON.parse(readFileSync(f, 'utf8'))
  const source = rel.startsWith('content/textbook') ? 'openstax' : rel.startsWith('content/classic') ? 'grays' : 'atlas'
  if (rel === 'content/landmarks.json') {
    // Keys are landmark names; values are bone ids.
    for (const k of Object.keys(data.landmarks)) texts.push({ text: k, where: `${rel} landmarks`, source })
    texts.push({ text: data.description, where: `${rel} description`, source })
    continue
  }
  // The textbook's Atlas-written parts (the list of changes) count as Atlas text.
  if (source === 'openstax' && data.changes) {
    data.changes.forEach((c, k) => texts.push({ text: c, where: `${rel} changes[${k}]`, source: 'atlas' }))
    delete data.changes
  }
  walkJson(data, rel, source)
}

/** Interface and server text: JSX text, labels, and string literals that read as prose. */
const PROSE_ATTRS = new Set(['aria-label', 'title', 'alt', 'placeholder', 'label', 'docLabel', 'eyebrow', 'stat', 'caption'])
const isCode = (s) => /[{}=]|\bgl_|\bvec\d|px\b|translate\(|rgba?\(|^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(s)
const isProse = (s) => /[A-Za-z]{2}/.test(s) && /\s/.test(s.trim()) && !isCode(s) && (/^[A-Z“‘"(]/.test(s.trim()) || /[.,:;!?…’]/.test(s))
const NOT_PROSE_CALLS = new Set(['querySelector', 'querySelectorAll', 'closest', 'matchMedia', 'require', 'log', 'error', 'warn', 'getElementById', 'setAttribute'])
function walkTs(file, source) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const rel = relative(ROOT, file)
  const add = (text, node) => texts.push({ text, where: `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`, source })
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    if (ts.isJsxAttribute(node) && node.name.getText() === 'className') return
    if (ts.isCallExpression(node) && NOT_PROSE_CALLS.has(node.expression.getText().split('.').pop())) return
    if (ts.isJsxText(node)) {
      const t = node.getText().replace(/\s+/g, ' ').trim()
      if (/[A-Za-z]/.test(t)) add(t, node)
    } else if (ts.isJsxAttribute(node) && PROSE_ATTRS.has(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer)) {
      add(node.initializer.text, node)
      return
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (isProse(node.text)) add(node.text, node)
    } else if (ts.isTemplateExpression(node)) {
      // The literal parts of a template, joined by "x" for each value (a single letter, never checked).
      const t = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('x')
      if (isProse(t)) add(t, node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}
for (const f of files(join(ROOT, 'src'), ['.ts', '.tsx'])) if (!/\.test\.tsx?$/.test(f)) walkTs(f, 'ui')
for (const f of files(join(ROOT, 'server', 'src'), ['.ts'])) if (!/\.test\.ts$/.test(f)) walkTs(f, 'server')
texts.push({ text: readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<title>([^<]*)<\/title>/)?.[1] ?? '', where: 'index.html <title>', source: 'ui' })

/* ── Spelling and British English ───────────────────────────────────────────────────────────────────────────── */

const WORD = /\p{L}+(?:['’]\p{L}+)*/gu
const ROMAN = /^[IVXLC]+$/
const decisionsNot = new Map(Object.values(dict.decisions).flatMap((d) => d.not.filter((n) => !n.startsWith('-')).map((n) => [n.toLowerCase(), d.use])))
/** Inflected forms of a known word: plurals (English and Latin), and adverbs in -ly ("posteriorly"). */
const bases = (w) => {
  const out = []
  const add = (re, rep) => re.test(w) && out.push(w.replace(re, rep))
  add(/s$/, '')
  add(/es$/, '')
  add(/ies$/, 'y')
  add(/i$/, 'us')
  add(/a$/, 'um')
  add(/a$/, 'on')
  add(/ae$/, 'a')
  add(/es$/, 'is')
  add(/ices$/, 'ex')
  add(/ices$/, 'ix')
  add(/ua$/, 'u')
  add(/ora$/, 'us')
  add(/ina$/, 'en')
  add(/ly$/, '')
  add(/ally$/, 'al')
  add(/ily$/, 'y')
  return out.filter((b) => b.length > 2)
}
const isKnown = (w, lower) => speller.correct(w) || speller.correct(lower) || settled.has(lower)
/** The authoritative source that approves a word (or a form it is inflected from), or null. */
const approvedBy = (lower) => sourceOf(lower) ?? bases(lower).map(sourceOf).find(Boolean) ?? null
const cache = new Map()
function verdict(word, source) {
  const key = source === 'grays' ? `g:${word}` : word
  if (cache.has(key)) return cache.get(key)
  let v = 'ok'
  const lower = word.toLowerCase()
  const british = toBritish(word)
  if (decisionsNot.has(lower) && !(lower === 'gray' && word === 'Gray')) v = { kind: 'decision', fix: decisionsNot.get(lower) }
  else if (british) v = { kind: 'american', fix: british }
  else if (isKnown(word, lower) || bases(lower).some((b) => isKnown(b, b))) v = 'ok'
  else if (approvedBy(lower)) v = { kind: 'source', source: approvedBy(lower) }
  else if (derivedFrom(lower)) v = { kind: 'source', source: 'Formed from a source word', from: derivedFrom(lower) }
  else if (proposed.has(lower) || (source === 'grays' && historical.has(lower))) v = 'proposed'
  else v = { kind: 'unknown' }
  cache.set(key, v)
  return v
}

const unknown = new Map() // word → { count, where: Set, sources: Set }
const american = new Map()
const usedProposed = new Map()
const bySourceWords = new Map() // approved by an authoritative source
const note = (map, w, t, extraInfo) => {
  const e = map.get(w) ?? { count: 0, where: new Set(), sources: new Set(), ...extraInfo }
  e.count++
  if (e.where.size < 4) e.where.add(t.where)
  e.sources.add(t.source)
  map.set(w, e)
}
let words = 0
for (const t of texts) {
  for (const m of withoutNames(t.text).matchAll(WORD)) {
    if (/\d$/.test(t.text.slice(0, m.index))) continue // "10th", "3rd"
    if (/^\d/.test(t.text.slice(m.index + m[0].length)) && m[0].length <= 3) continue // "C7"-like codes are not words
    let w = m[0].replace(/['’]s$/, '').replace(/['’]$/, '')
    if (w.length < 2 || ROMAN.test(w) || /[\u0370-\u03ff]/u.test(w)) continue // Greek letters are symbols in formulas (8ηλ, πr⁴)
    words++
    const v = verdict(w, t.source)
    if (v === 'ok') continue
    if (v === 'proposed') note(usedProposed, w.toLowerCase(), t)
    else if (v.kind === 'source') note(bySourceWords, w.toLowerCase(), t, { source: v.source, from: v.from })
    else if (v.kind === 'unknown') note(unknown, w, t)
    else if (!t.alt) note(american, w, t, { fix: v.fix, kind: v.kind })
  }
}

/* ── Consistency: one form per name ─────────────────────────────────────────────────────────────────────────── */

const prose = texts.filter((t) => !t.alt)
const allText = prose.map((t) => t.text).join('\n')
const inconsistent = []
// 1. Bone and landmark names: written exactly, in lower case, or with a capital first letter, never in other cases.
const bones = files(join(ROOT, 'content', 'bones'), ['.json']).map((f) => JSON.parse(readFileSync(f, 'utf8')))
const names = new Set([...bones.map((b) => b.name), ...Object.keys(JSON.parse(readFileSync(join(ROOT, 'content', 'landmarks.json'), 'utf8')).landmarks)])
for (const name of names) {
  if (!/\s/.test(name)) continue
  const ok = new Set([name, name.toLowerCase(), name[0].toUpperCase() + name.slice(1).toLowerCase(), name[0].toUpperCase() + name.slice(1)])
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
  const bad = new Map()
  // Gray's 1918 capitalises a structure where it introduces it ("The First Thoracic Vertebra has…"): its own
  // typographic emphasis, kept as published.
  for (const t of prose.filter((x) => x.source !== 'grays'))
    for (const m of t.text.matchAll(re)) {
      if (ok.has(m[0])) continue
      // Title Case is allowed in headings: a whole string in Title Case, or a run-in heading ("Foramen Magnum.—The …").
      if (/^([A-Z][a-z]*\s?)+$/.test(t.text.trim()) && t.text.length < 60) continue
      const runIn = t.text.indexOf('.—')
      if (runIn > 0 && m.index < runIn) continue
      const e = bad.get(m[0]) ?? { count: 0, where: [] }
      e.count++
      if (e.where.length < 3) e.where.push(t.where)
      bad.set(m[0], e)
    }
  for (const [form, e] of bad) inconsistent.push({ kind: 'case', name, form, ...e })
}
// 2. The forms the dictionary rules out ("antero-posterior" where "anteroposterior" is the form used).
for (const [from, to] of Object.entries(dict.forms ?? {})) {
  const re = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
  const where = prose.filter((t) => re.test(t.text)).map((t) => t.where)
  if (where.length) inconsistent.push({ kind: 'form', name: to, form: from, count: where.length, where: where.slice(0, 3) })
}
// 3. The same word written closed and hyphenated anywhere else ("radioulnar", "radio-ulnar").
const forms = new Map()
for (const m of allText.matchAll(/\b([A-Za-z]{3,})(-| )?([A-Za-z]{3,})\b/g)) {
  const joined = (m[1] + m[3]).toLowerCase()
  const style = m[2] === '-' ? 'hyphen' : m[2] === ' ' ? 'space' : 'closed'
  if (style === 'space') continue // ordinary two-word phrases are counted only when the closed or hyphenated form exists
  const e = forms.get(joined) ?? new Map()
  e.set(style === 'hyphen' ? `${m[1]}-${m[3]}`.toLowerCase() : joined, (e.get(style === 'hyphen' ? `${m[1]}-${m[3]}`.toLowerCase() : joined) ?? 0) + 1)
  forms.set(joined, e)
}
const closedWords = new Set()
for (const m of allText.matchAll(/\b[A-Za-z]{6,}\b/g)) closedWords.add(m[0].toLowerCase())
for (const [joined, e] of forms) {
  const hyph = [...e.keys()].find((k) => k.includes('-'))
  if (hyph && closedWords.has(joined) && speller.correct(joined) !== speller.correct(hyph.replace('-', ''))) continue
  if (hyph && closedWords.has(joined) && !(dict.forms ?? {})[hyph] && !(dict.forms ?? {})[joined]) inconsistent.push({ kind: 'hyphen', name: joined, form: hyph, count: e.get(hyph), closed: [...allText.matchAll(new RegExp(`\\b${joined}\\b`, 'gi'))].length })
}

// 4. Sentence case in Atlas-written text: a structure's name is never in Title Case except to start a sentence
// ("the first thoracic vertebra", not "the First Thoracic Vertebra"). Gray's keeps its own capitals; OpenStax headings
// keep theirs.
const taPhrases = new Set(JSON.parse(readFileSync(join(ROOT, 'data', 'sources', 'terminologia.json'), 'utf8')).terms.map((t) => (t.en ?? '').toLowerCase()).filter((t) => t.includes(' ')))
const structurePhrases = new Set([...taPhrases, ...[...names].map((n) => n.toLowerCase())])
// Citations of titles (source lines: "8.1 The Pectoral Girdle") keep the title's capitals.
for (const t of prose.filter((x) => ['atlas', 'ui', 'server'].includes(x.source) && !/\.(source|ref)\b/.test(x.where)))
  for (const m of withoutNames(t.text).matchAll(/(?<![.!?:]\s|^)\b([A-Z][a-z]+(?: [A-Z][a-z]+)+)\b/g)) {
    const phrase = m[1].toLowerCase()
    const hit = [...structurePhrases].find((p) => phrase === p || phrase.endsWith(` ${p}`) || phrase.startsWith(`${p} `))
    if (hit) inconsistent.push({ kind: 'case', name: m[1].toLowerCase(), form: m[1], count: 1, where: [t.where] })
  }

/* ── Abbreviations: written out in full the first time each appears in a lesson ────────────────────────────── */

const abbrMissing = []
const lesson = (where, parts) => {
  for (const u of firstUses(parts).undefined) abbrMissing.push({ where, token: u.token, context: u.context, full: u.full })
}
for (const f of files(join(ROOT, 'content', 'textbook'), ['.json'])) {
  const d = JSON.parse(readFileSync(f, 'utf8'))
  if (d.blocks) lesson(relative(ROOT, f), sectionParts(d))
}
for (const f of files(join(ROOT, 'content', 'questions'), ['.json'])) for (const q of JSON.parse(readFileSync(f, 'utf8')).questions) lesson(`${relative(ROOT, f)} ${q.id}`, partsOf(q))
for (const f of files(join(ROOT, 'content', 'cards'), ['.json'])) for (const c of JSON.parse(readFileSync(f, 'utf8')).cards) lesson(`${relative(ROOT, f)} ${c.id}`, partsOf(c))
for (const f of files(join(ROOT, 'content', 'bones'), ['.json'])) lesson(relative(ROOT, f), partsOf(JSON.parse(readFileSync(f, 'utf8'))))

/* ── Grammar: fast rules (every build), LanguageTool (with --grammar) ───────────────────────────────────────── */

const RULES = [
  ['repeated word', /\b(\w+)\s+\1\b/gi, (m) => !/^(that|had|is|do|ha|bye|no|very|far|x)$/i.test(m[1]) && !/^\d/.test(m[1])],
  ['space before punctuation', / [,.;:!?](?=\s|$)/g],
  ['missing space after punctuation', /[a-z][,;:][A-Za-z]|[a-z]\.[A-Z][a-z]/g],
  ['double space', / {2,}/g, null, ['atlas', 'ui', 'server']], // in the books, joined table cells (browsers show one space)
  ['a before a vowel', /\ba (?=[aeio][a-z])(?!one|uni|use|usu|eu|ewe|once|europ)/g], // lower-case article only (not the label “A”)
  ['an before a consonant', /\ban (?=[bcdfgjklmnpqrstvwxyz])(?!hour|honou|heir|honest)/g], // "an L-shaped", "an LMN": letters sound with a vowel
  ['unbalanced brackets', null],
]
const grammar = []
for (const t of prose) {
  if (t.source === 'ui' && t.text.length < 4) continue
  for (const [name, re, keep, only] of RULES) {
    if (only && !only.includes(t.source)) continue
    if (!re) {
      const open = (t.text.match(/\(/g) ?? []).length
      const close = (t.text.match(/\)/g) ?? []).length
      if (open !== close && t.source !== 'ui') grammar.push({ rule: name, text: t.text.slice(0, 120), where: t.where, source: t.source })
      continue
    }
    for (const m of t.text.matchAll(re)) if (!keep || keep(m)) grammar.push({ rule: name, text: t.text.slice(Math.max(0, m.index - 40), m.index + 40), where: t.where, source: t.source })
  }
}

/**
 * LanguageTool rules that are wrong for Atlas: spelling is checked above (MORFOLOGIK), Atlas spells -ise
 * (OXFORD_SPELLING_Z_NOT_S), anatomy uses "trunk", "pubic" and "no body" correctly (TRUNK_BOOT, PUBIC_X, ANY_BODY), and
 * interface text is read in pieces split by markup, which trips the spacing, bracket and quote rules.
 */
const LT_OFF = ['MORFOLOGIK_RULE_EN_GB', 'WHITESPACE_RULE', 'EN_QUOTES', 'DASH_RULE', 'COMMA_PARENTHESIS_WHITESPACE', 'UPPERCASE_SENTENCE_START', 'PUNCTUATION_PARAGRAPH_END', 'SENTENCE_FRAGMENT', 'OXFORD_SPELLING_Z_NOT_S', 'TRUNK_BOOT', 'PUBIC_X', 'ANY_BODY', 'CONSECUTIVE_SPACES', 'UNLIKELY_OPENING_PUNCTUATION', 'EN_UNPAIRED_BRACKETS', 'EN_UNPAIRED_QUOTES']
let languageTool = null
if (GRAMMAR) {
  // Atlas's own text, one item per paragraph; OpenStax and Gray's are checked separately in the report (as published).
  const own = prose.filter((t) => t.source !== 'openstax' && t.source !== 'grays' && t.text.length > 12)
  const file = join(ROOT, '.cache', 'textcheck-lt.txt')
  writeFileSync(file, own.map((t) => t.text.replace(/\n/g, ' ')).join('\n\n'))
  const out = execFileSync('java', ['-cp', join(ROOT, '.cache', 'languagetool', '*'), 'org.languagetool.commandline.Main', '-l', 'en-GB', '--json', '--disable', LT_OFF.join(','), file], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  const starts = []
  let pos = 0
  for (const t of own) {
    starts.push(pos)
    pos += t.text.replace(/\n/g, ' ').length + 2
  }
  const at = (offset) => {
    let k = starts.findIndex((s) => s > offset)
    k = (k < 0 ? starts.length : k) - 1
    return own[k]
  }
  languageTool = JSON.parse(out.slice(out.indexOf('{'))).matches.map((m) => ({ rule: m.rule.id, message: m.message, context: m.context.text, where: at(m.offset)?.where, suggestion: m.replacements?.[0]?.value }))
}

/* ── Report ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const bySource = (map) => {
  const out = {}
  for (const e of map.values()) for (const s of e.sources) out[s] = (out[s] ?? 0) + 1
  return out
}
const list = (map, fmt) => [...map].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).map(fmt)
const fail = unknown.size + american.size + inconsistent.length + abbrMissing.length
const L = [
  '# Atlas text check',
  '',
  `${texts.length.toLocaleString('en-GB')} pieces of text, ${words.toLocaleString('en-GB')} words. Standard: British English (-ise); dictionary: en-GB base + ${dict.terminologia.words.length.toLocaleString('en-GB')} Terminologia Anatomica words + ${Object.keys(dict.approved).length} approved + ${Object.keys(dict.proposed).length} proposed.`,
  '',
  `**Result: ${fail ? 'FAIL' : 'PASS'}.** Unknown words: ${unknown.size}. American spellings: ${american.size}. Names written two ways or in the wrong case: ${inconsistent.length}. Abbreviations not written out at first use: ${abbrMissing.length}. Grammar rule hits: ${grammar.length}${languageTool ? `; LanguageTool: ${languageTool.length}` : ''}.`,
  '',
]
if (unknown.size) L.push('## Unknown words (fix or approve)', '', `By source: ${JSON.stringify(bySource(unknown))}`, '', '| Word | Count | Where |', '|---|---|---|', ...list(unknown, ([w, e]) => `| ${w} | ${e.count} | ${[...e.where].join('<br>')} |`), '')
if (abbrMissing.length) L.push('## Abbreviations not written out at first use', '', ...abbrMissing.map((a) => `- ${a.where}: **${a.token}**${a.full ? ` (${a.full})` : ' (no full form known)'} in “…${a.context}…”`), '')
if (american.size) L.push('## American spellings', '', '| Word | British | Count | Where |', '|---|---|---|---|', ...list(american, ([w, e]) => `| ${w} | ${e.fix} | ${e.count} | ${[...e.where].join('<br>')} |`), '')
if (inconsistent.length) L.push('## Names written two ways', '', ...inconsistent.map((i) => (i.kind === 'case' || i.kind === 'form' ? `- “${i.form}” (${i.count}×) should be “${i.name}”: ${i.where.join(', ')}` : `- “${i.form}” (${i.count}×) and “${i.name}” (${i.closed}×)`)), '')
// --prune: drop proposed and Gray's-only words that are no longer used, or that a source now approves.
if (process.argv.includes('--prune')) {
  const needed = new Set(usedProposed.keys())
  for (const key of ['proposed', 'historical']) for (const w of Object.keys(dict[key] ?? {})) if (!needed.has(w.toLowerCase())) delete dict[key][w]
  writeFileSync(join(ROOT, 'data', 'dictionary.json'), JSON.stringify(dict, null, 1) + '\n')
}

// The words no authoritative source has, grouped, with a suggested correction where one helps.
function wordsToReview() {
  const lines = []
  const sections = [
    ['Words that match no source (awaiting your decision)', dict.proposed],
    ['Words that appear only in Gray’s 1918 text', dict.historical ?? {}],
  ]
  let total = 0
  for (const [title, obj] of sections) {
    const by = new Map()
    for (const [w, e] of Object.entries(obj)) by.set(e.group, [...(by.get(e.group) ?? []), [w, e.suggestion]])
    const n = Object.keys(obj).length
    total += n
    lines.push(`## ${title} (${n})`, '')
    for (const [g, ws] of [...by].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`**${g}** (${ws.length})`, '')
      const plain = ws.filter(([, sug]) => !sug).map(([w]) => w).sort((a, b) => a.localeCompare(b))
      const withSug = ws.filter(([, sug]) => sug).sort((a, b) => a[0].localeCompare(b[0]))
      if (plain.length) lines.push(plain.join(' · '), '')
      for (const [w, sug] of withSug) lines.push(`- **${w}**: ${sug}`)
      if (withSug.length) lines.push('')
    }
  }
  return { lines, total }
}
const review = wordsToReview()
writeFileSync(
  join(ROOT, 'docs', 'words-to-review.md'),
  [
    '# Words to review',
    '',
    `Every word Atlas shows is checked against the en-GB dictionary, Terminologia Anatomica, the OpenStax A&P 2e glossary, MeSH (in British spelling) and the NHS A–Z, including words formed regularly from those. These ${review.total} match none of them. Each passes the check until you decide: approve it, or apply the suggestion.`,
    '',
    ...review.lines,
  ].join('\n'),
)

// What a person decides: the standard, and every word and change awaiting approval.
const group = (obj) => {
  const by = new Map()
  for (const [w, why] of Object.entries(obj)) by.set(why, [...(by.get(why) ?? []), w])
  return [...by].sort((a, b) => b[1].length - a[1].length)
}
L.push(
  '## Spelling decisions (enforced)',
  '',
  ...Object.values(dict.decisions).map((d) => `- **${d.use}**, not ${d.not.join(', ')}: ${d.why}`),
  ...Object.entries(dict.keep ?? {}).map(([w, why]) => `- **${w}** kept: ${why}`),
  '',
  '## One form per word (enforced; the left-hand form is never used)',
  '',
  Object.entries(dict.forms ?? {}).map(([a, b]) => `${a} → **${b}**`).join(' · '),
  '',
  '## Corrections made to the imported books',
  '',
  ...Object.entries(dict.corrections ?? {}).map(([src, list]) => `- **${src === 'openstax' ? 'OpenStax' : 'Gray’s'}:** ${Object.entries(list).map(([a, b]) => `“${a}” → “${b}”`).join('; ')}`),
  '',
  ...review.lines,
)
L.push('## Grammar: rule checks', '', grammar.length ? '' : 'None.', ...grammar.slice(0, 200).map((g) => `- ${g.rule} (${g.source}, ${g.where}): “…${g.text.replace(/\n/g, ' ')}…”`), '')
if (languageTool) L.push('## Grammar: LanguageTool (en-GB), Atlas’s own text', '', languageTool.length ? '' : 'None.', ...languageTool.map((m) => `- ${m.rule} (${m.where}): ${m.message} “${m.context}”${m.suggestion ? ` → ${m.suggestion}` : ''}`), '')
writeFileSync(join(ROOT, 'docs', 'text-report.md'), L.join('\n'))
console.log(L.slice(0, 5).join('\n'))
if (process.argv.includes('--json')) writeFileSync(join(ROOT, '.cache', 'textcheck.json'), JSON.stringify({ abbrMissing, proposedUsed: [...usedProposed].map(([w, e]) => [w, e.count, [...e.where], [...e.sources]]), bySource: [...bySourceWords].map(([w, e]) => [w, e.source, e.count, e.from]), unknown: [...unknown].map(([w, e]) => [w, e.count, [...e.where], [...e.sources]]), american: [...american].map(([w, e]) => [w, e.fix, e.count, [...e.where], [...e.sources]]), inconsistent, grammar, languageTool }, null, 1))
process.exit(fail ? 1 : 0)
