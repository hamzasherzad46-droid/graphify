import { hasClassic, loadClassic, loadSection, plain, type Block } from './textbook'
import { QUESTIONS } from './questions'
import { generatedQuestion } from './notesExam'

/** Plain text of each paragraph id in a list of blocks, as the reader shows it. */
function collect(blocks: Block[], out: Map<string, string>) {
  for (const b of blocks) {
    if (b.t === 'p') out.set(b.id, plain(b.inl))
    else if (b.t === 'list') out.set(b.id, b.items.map(plain).join(''))
    else if (b.t === 'fig') out.set(b.id, `${b.label} ${b.title} ${plain(b.caption)}`)
    else if (b.t === 'note') collect(b.blocks, out)
  }
}

/**
 * Every paragraph of a document ('tb:<section>' or 'eq:<question>'), in reading order: id → plain text. Used to
 * order highlights and notes as they appear, and to build fill-in-the-blank cards from the full sentence.
 */
export async function paragraphsOf(doc: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const [kind, id] = [doc.slice(0, 2), doc.slice(3)]
  if (kind === 'tb') {
    const s = await loadSection(id)
    for (const k of s.keyPoints) out.set(k.id, plain([...k.lead, ...(k.rest.length ? [' ', ...k.rest] : [])]))
    collect(s.blocks, out)
    if (hasClassic(id)) for (const e of (await loadClassic(id)).entries) collect(e.blocks, out)
  } else if (kind === 'eq') {
    const q = QUESTIONS.find((x) => x.id === id) ?? generatedQuestion(id)?.q
    if (q) {
      if (q.answerText) out.set(`${q.id}-answer`, q.answerText)
      out.set(`${q.id}-why`, q.why)
      q.whyNot?.forEach((w, k) => w && out.set(`${q.id}-not-${k}`, `${'ABCD'[k]} ${w}`))
      out.set(`${q.id}-tip`, q.tip)
    }
  }
  return out
}
