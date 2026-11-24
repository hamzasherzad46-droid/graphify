import { useEffect, useMemo, useRef, useState } from 'react'
import { COLORS, useAnnotations, type Annotation, type HighlightColor } from '../../learn/annotations'
import { paragraphsOf } from '../../learn/paragraphs'
import { SECTIONS } from '../../learn/textbook'
import { QUESTIONS } from '../../learn/questions'
import { generatedQuestion, sortedSets, useNoteSets } from '../../learn/notesExam'
import { TOPICS } from '../../learn/topics'
import { cardKey, liveCards, suggestFromHighlight, suggestFromNote, useMyCards } from '../../learn/mycards'
import { useProgress } from '../../state/progress'
import { useFlash, useNav, type Page } from '../../state/nav'
import { useSession } from '../../learn/session'
import { haptic } from '../../lib/feedback'
import { useToast } from '../toastStore'
import { ChevronRightIcon } from '../Icons'
import { PageHead } from './PageHead'
import { Portal } from '../Portal'

const COLOR_LABEL: Record<HighlightColor, string> = { yellow: 'Yellow', teal: 'Teal', pink: 'Pink', blue: 'Blue' }

/** Book order for documents: textbook sections as in the book, then exam questions by topic and number. */
function docOrder(doc: string): number {
  if (doc.startsWith('tb:')) return SECTIONS.findIndex((s) => s.id === doc.slice(3))
  const q = QUESTIONS.findIndex((x) => x.id === doc.slice(3))
  if (q >= 0) return 1000 + q
  // Questions from the student's notes: newest set first, then by number.
  const g = generatedQuestion(doc.slice(3))
  if (g) return 3000 + sortedSets(useNoteSets.getState().sets).indexOf(g.set) * 100 + g.n
  return 9999
}

/** Where tapping an item goes: the reader at its paragraph, or the question in its topic. */
function pagesFor(a: Annotation): Page[] {
  if (a.doc.startsWith('tb:')) return SECTIONS.some((x) => x.id === a.doc.slice(3)) ? [{ kind: 'reader', section: a.doc.slice(3), anchor: a.segs[0]?.para }] : []
  const q = QUESTIONS.find((x) => x.id === a.doc.slice(3))
  if (q) return [{ kind: 'topic', area: 'exam', topic: q.topic, anchor: q.id }]
  const g = generatedQuestion(a.doc.slice(3))
  return g ? [{ kind: 'noteset', id: g.set.id, anchor: g.q.id }] : []
}

/** My Highlights or My Notes: everything the student marked, grouped by chapter, newest work findable in a tap. */
export function MyAnnotations({ what }: { what: 'highlights' | 'notes' }) {
  const items = useAnnotations((s) => s.items)
  const ready = useAnnotations((s) => s.ready)
  // Labels and links for notes on questions from the student's own notes.
  useNoteSets((s) => s.sets)
  const [color, setColor] = useState<HighlightColor | 'all'>('all')
  const [editing, setEditing] = useState<{ a: Annotation; front: string; back: string } | null>(null)
  const myCards = useMyCards((s) => s.cards)
  const all = useMemo(
    () => Object.values(items).filter((a) => !a.deletedAt && (what === 'highlights' ? !!a.color && a.segs.length > 0 : a.note.trim().length > 0)),
    [items, what],
  )
  const shown = what === 'highlights' && color !== 'all' ? all.filter((a) => a.color === color) : all

  // Paragraph order inside each document, so items read in the order they appear in the text.
  const docs = useMemo(() => [...new Set(all.map((a) => a.doc))], [all])
  const [order, setOrder] = useState<Record<string, string[]>>({})
  // Each document is read once; results arriving after the page has closed are ignored.
  const requested = useRef(new Set<string>())
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    for (const d of docs) {
      if (requested.current.has(d)) continue
      requested.current.add(d)
      void paragraphsOf(d)
        .then((m) => mounted.current && setOrder((o) => ({ ...o, [d]: [...m.keys()] })))
        .catch(() => {})
    }
  }, [docs])

  const groups = useMemo(() => {
    const by = new Map<string, Annotation[]>()
    for (const a of shown) by.set(a.doc, [...(by.get(a.doc) ?? []), a])
    const pos = (a: Annotation) => {
      const ids = order[a.doc]
      const k = ids && a.segs[0] ? ids.indexOf(a.segs[0].para) : -1
      return k < 0 ? 1e6 : k
    }
    return [...by.entries()]
      .sort((x, y) => docOrder(x[0]) - docOrder(y[0]))
      .map(([doc, list]) => ({ doc, label: groupLabel(list[0]), items: [...list].sort((p, q) => pos(p) - pos(q) || p.createdAt.localeCompare(q.createdAt)) }))
  }, [shown, order])

  const cardFor = (a: Annotation) => liveCards(myCards).find((c) => c.from.annotation === a.id)
  const toast = useToast((s) => s.show)

  const open = (a: Annotation) => {
    haptic('light')
    useFlash.getState().flash(a.id)
    for (const p of pagesFor(a)) useNav.getState().push(p)
  }

  const makeCard = async (a: Annotation) => {
    haptic('light')
    const paras = await paragraphsOf(a.doc).catch(() => new Map<string, string>())
    const para = a.segs[0] ? paras.get(a.segs[0].para) : undefined
    const q = a.doc.startsWith('eq:') ? (QUESTIONS.find((x) => x.id === a.doc.slice(3)) ?? generatedQuestion(a.doc.slice(3))?.q) : undefined
    const s = what === 'notes' ? suggestFromNote(a, a.segs.length ? para : q?.stem) : suggestFromHighlight(a, para)
    setEditing({ a, ...s })
  }

  const cards = liveCards(myCards)
  const due = cards.filter((c) => {
    const st = useProgress.getState().cards[cardKey(c)]
    return !st || new Date(st.due) <= new Date()
  }).length

  return (
    <div className="tab-page lessons mine">
      <PageHead eyebrow="Lessons" title={what === 'highlights' ? 'My Highlights' : 'My Notes'} />
      <div className="page-body">
        {cards.length > 0 && (
          <button className="row-card mycards-row" onClick={() => useSession.getState().open('mycards')}>
            <span className="row-k">My cards</span>
            <span className="row-v">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {due ? `${due} to study now` : 'all caught up'}
            </span>
            <ChevronRightIcon className="row-go" />
          </button>
        )}
        {what === 'highlights' && all.length > 0 && (
          <div className="chip-row hl-filter" role="radiogroup" aria-label="Colour">
            <button role="radio" aria-checked={color === 'all'} className={`chip ${color === 'all' ? 'on' : ''}`} onClick={() => setColor('all')}>
              All · {all.length}
            </button>
            {COLORS.map((c) => {
              const n = all.filter((a) => a.color === c).length
              return (
                <button key={c} role="radio" aria-checked={color === c} className={`chip ${color === c ? 'on' : ''}`} disabled={!n} onClick={() => setColor(c)}>
                  <span className={`dot hl-${c}`} aria-hidden /> {COLOR_LABEL[c]} · {n}
                </button>
              )
            })}
          </div>
        )}
        {ready && !all.length && (
          <div className="empty-note">
            {what === 'highlights'
              ? 'No highlights yet. In the textbook or an exam explanation, select some text and pick a colour.'
              : 'No notes yet. Select some text and tap Note, or tap the note pin on a question.'}
          </div>
        )}
        {groups.map((g) => (
          <section key={g.doc} className="mine-group">
            <h3>{g.label}</h3>
            <ul>
              {g.items.map((a) => {
                const card = cardFor(a)
                return (
                  <li key={a.id} className={`mine-item ${a.color ? `c-${a.color}` : 'c-none'}`}>
                    <button className="mine-open" onClick={() => open(a)} aria-label={`Open: ${a.segs[0]?.quote ?? a.docLabel}`}>
                      {what === 'notes' && <p className="mine-note">{a.note}</p>}
                      <p className={what === 'notes' ? 'mine-on' : 'mine-quote'}>
                        {!a.segs.length ? 'On this question' : a.scope === 'para' && what === 'notes' ? `On the paragraph: “${short(a.segs[0].quote, 80)}”` : `“${short(a.segs.map((s) => s.quote).join(' … '), what === 'notes' ? 90 : 240)}”`}
                      </p>
                      {what === 'highlights' && a.note.trim() && <p className="mine-has-note">Note: {short(a.note, 90)}</p>}
                      <span className="mine-date">{new Date(a.updatedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                    </button>
                    <div className="mine-actions">
                      {card ? (
                        <span className="mine-carded">Flashcard made</span>
                      ) : (
                        <button className="link-btn" onClick={() => void makeCard(a)}>
                          Turn into flashcard
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      {editing && (
        <CardEditor
          {...editing}
          onCancel={() => setEditing(null)}
          onSave={(front, back) => {
            useMyCards.getState().add({ front, back, from: { annotation: editing.a.id, doc: editing.a.doc, docLabel: editing.a.docLabel } })
            haptic('success')
            toast('Added to My cards')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

function groupLabel(a: Annotation): string {
  if (a.doc.startsWith('tb:')) {
    const s = SECTIONS.find((x) => x.id === a.doc.slice(3))
    return s ? (s.num.includes('.') ? `${s.num} ${s.title}` : `Chapter ${s.num}: ${s.chapterTitle}`) : a.docLabel
  }
  const q = QUESTIONS.find((x) => x.id === a.doc.slice(3))
  if (!q) {
    const g = generatedQuestion(a.doc.slice(3))
    return g ? `Notes to Exam: ${g.set.title}, question ${g.n}` : a.docLabel
  }
  const topic = TOPICS.find((t) => t.id === q.topic)?.title ?? q.topic
  return `Exam-style questions: ${topic}, question ${QUESTIONS.filter((x) => x.topic === q.topic).indexOf(q) + 1}`
}

/** Check and edit the suggested card before saving it. */
function CardEditor({ front, back, onSave, onCancel }: { front: string; back: string; onSave: (f: string, b: string) => void; onCancel: () => void }) {
  const [f, setF] = useState(front)
  const [b, setB] = useState(back)
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onCancel}>
        <aside className="sheet card-editor" role="dialog" aria-modal aria-label="New flashcard" onClick={(e) => e.stopPropagation()}>
          <h2>New flashcard</h2>
          <p className="muted small">Edit either side if you like. It joins My cards and comes back when FSRS schedules it.</p>
          <label className="field">
            <span>Front (the question)</span>
            <textarea rows={4} value={f} onChange={(e) => setF(e.target.value)} />
          </label>
          <label className="field">
            <span>Back (the answer)</span>
            <textarea rows={3} value={b} onChange={(e) => setB(e.target.value)} />
          </label>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn primary" disabled={!f.trim() || !b.trim()} onClick={() => onSave(f.trim(), b.trim())}>
              Add card
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  )
}
