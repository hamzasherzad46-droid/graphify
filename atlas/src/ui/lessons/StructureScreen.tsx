import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHead } from './PageHead'
import { Annotatable } from './Annotatable'
import { Portal } from '../Portal'
import { CardsIcon, ChevronIcon, CubeIcon, QuestionIcon } from '../Icons'
import { useNav } from '../../state/nav'
import { useSession } from '../../learn/session'
import { LAYERED } from '../../learn/layered'
import { QUESTIONS } from '../../learn/questions'
import { topicById } from '../../learn/topics'
import { haptic } from '../../lib/feedback'
import { tap } from '../../learn/sound'
import { loadGlossary, nameOf, needsReview, pronounce, splitTerms, structureById, termMatcher, TUTORIAL_NAME, type Fact, type GlossaryEntry, type Piece, type Structure } from '../../learn/structures'

const LETTERS = 'ABCD'

/** The glossary, a matcher for its terms, and the term the student tapped. */
const Gloss = createContext<{
  re: RegExp | null
  open: (term: string) => void
}>({ re: null, open: () => {} })

/** Mark glossary terms in a group of texts: each term once per group (a section), so the page is not all links. */
function useTerms(texts: string[]): Piece[][] {
  const { re } = useContext(Gloss)
  const key = texts.join('\u0000')
  return useMemo(() => {
    if (!re) return texts.map((t) => [t])
    const seen = new Set<string>()
    return texts.map((t) => splitTerms(t, re, seen))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [re, key])
}

function Pieces({ pieces }: { pieces: Piece[] }) {
  const { open } = useContext(Gloss)
  return (
    <>
      {pieces.map((p, k) =>
        typeof p === 'string' ? (
          p
        ) : (
          <button key={k} type="button" className="term" onClick={() => open(p.term)} aria-label={`${p.text}: show the definition`}>
            {p.text}
          </button>
        ),
      )}
    </>
  )
}

const Dagger = ({ f }: { f: { check?: string } }) =>
  f.check ? (
    <sup className="lc-check" title="Awaiting a source check">
      †
    </sup>
  ) : null

/** A section with "Explain simpler" and, where there is more, "Explain deeper". */
function Section({ n, title, id, simpler, deeper, children }: { n: number; title: string; id: string; simpler?: { f: Fact; pid: string }; deeper?: { f: Fact; pid: string }; children: ReactNode }) {
  const [mode, setMode] = useState<'normal' | 'simpler' | 'deeper'>('normal')
  const [s, d] = useTerms([simpler?.f.t ?? '', deeper?.f.t ?? ''])
  const pick = (m: 'simpler' | 'deeper') => {
    tap()
    setMode((x) => (x === m ? 'normal' : m))
  }
  return (
    <section className="st-section" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span className="st-n">{n}</span>
        {title}
      </h2>
      {mode === 'simpler' && simpler ? (
        <p className="st-simpler" data-pid={simpler.pid}>
          <Pieces pieces={s} />
          <Dagger f={simpler.f} />
        </p>
      ) : (
        children
      )}
      {mode === 'deeper' && deeper && (
        <p className="st-deeper" data-pid={deeper.pid}>
          <span className="k">Deeper</span>
          <Pieces pieces={d} />
          <Dagger f={deeper.f} />
        </p>
      )}
      {(simpler || deeper) && (
        <div className="st-explain" role="group" aria-label="Explain">
          {simpler && (
            <button className={`chip lc-simpler ${mode === 'simpler' ? 'on' : ''}`} aria-pressed={mode === 'simpler'} onClick={() => pick('simpler')}>
              Explain simpler
            </button>
          )}
          {deeper && (
            <button className={`chip lc-simpler ${mode === 'deeper' ? 'on' : ''}`} aria-pressed={mode === 'deeper'} onClick={() => pick('deeper')}>
              Explain deeper
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function Facts({ facts, pid }: { facts: Fact[]; pid: string }) {
  const pieces = useTerms(facts.map((f) => f.t))
  return (
    <ul className="st-facts">
      {facts.map((f, k) => (
        <li key={k} data-pid={`${pid}-${k}`}>
          <Pieces pieces={pieces[k]} />
          <Dagger f={f} />
        </li>
      ))}
    </ul>
  )
}

function Named({ items, pid, tag }: { items: { name: string; t: string; check?: string; kind?: string }[]; pid: string; tag?: boolean }) {
  const pieces = useTerms(items.flatMap((x) => [x.name, x.t]))
  return (
    <dl className="st-named">
      {items.map((x, k) => (
        <div key={k} data-pid={`${pid}-${k}`}>
          <dt>
            {tag && x.kind && <span className="st-kind">{x.kind}</span>}
            <Pieces pieces={pieces[2 * k]} />
          </dt>
          <dd>
            <Pieces pieces={pieces[2 * k + 1]} />
            <Dagger f={x} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** One structure, in nine layers: 1–3 first, 4–9 under "Go deeper", then a three-question check. */
export function StructureScreen({ id, anchor }: { id: string; anchor?: string }) {
  const s = structureById(id)
  const [glossary, setGlossary] = useState<Map<string, GlossaryEntry> | null>(null)
  const [term, setTerm] = useState<string | null>(null)
  // Open "Go deeper" straight away when a highlight or note in it was tapped.
  const deepAnchor = !!anchor && !/^(one|where|feat)\b/.test(anchor.slice(id.length + 1))
  const [deep, setDeep] = useState(deepAnchor)

  useEffect(() => {
    let live = true
    void loadGlossary().then((g) => live && setGlossary(g))
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (!anchor) return
    const t = window.setTimeout(() => {
      document.querySelector(`[data-pid="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: 'center' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [anchor])

  const re = useMemo(() => (glossary ? termMatcher(glossary.keys()) : null), [glossary])
  const gloss = useMemo(() => ({ re, open: (t: string) => (haptic('light'), setTerm(t)) }), [re, setTerm])

  if (!s) return null
  const name = nameOf(s)
  const topic = topicById(s.topic)?.title ?? s.topic

  return (
    <div className="tab-page lessons structure">
      <PageHead eyebrow={`Structure · ${topic}`} title={name} />
      <div className="page-body">
        <Gloss.Provider value={gloss}>
          <Links s={s} name={name} />
          <p className="muted small st-howto">Tap an underlined term for its meaning and how to say it.</p>
          <Annotatable doc={`st:${s.id}`} docLabel={`Structure: ${name}`} className="st-doc">
            <Lesson s={s} deep={deep} onDeep={() => (tap(), setDeep((x) => !x))} />
          </Annotatable>
          <Check s={s} />
          <Foot s={s} />
        </Gloss.Provider>
      </div>
      {term && glossary?.get(term) && <TermSheet entry={glossary.get(term)!} onClose={() => setTerm(null)} />}
    </div>
  )
}

function Lesson({ s, deep, onDeep }: { s: Structure; deep: boolean; onDeep: () => void }) {
  const [one] = useTerms([s.oneLine.main.t])
  const p = s.id
  return (
    <>
      <Section n={1} title="In one line" id={`${p}-s1`} simpler={{ f: s.oneLine.simpler, pid: `${p}-one-simpler` }} deeper={{ f: s.oneLine.deeper, pid: `${p}-one-deeper` }}>
        <p className="st-one" data-pid={`${p}-one`}>
          <Pieces pieces={one} />
          <Dagger f={s.oneLine.main} />
        </p>
      </Section>
      <Section n={2} title="Where it is" id={`${p}-s2`} simpler={{ f: s.where.simpler, pid: `${p}-where-simpler` }} deeper={{ f: s.where.deeper, pid: `${p}-where-deeper` }}>
        <Facts facts={s.where.facts} pid={`${p}-where`} />
      </Section>
      <Section n={3} title="Key features" id={`${p}-s3`} simpler={{ f: s.features.simpler, pid: `${p}-feat-simpler` }} deeper={{ f: s.features.deeper, pid: `${p}-feat-deeper` }}>
        <Named items={s.features.items} pid={`${p}-feat`} />
      </Section>

      <section className={`lc-layer st-deep ${deep ? 'open' : ''}`}>
        <button className="lc-layer-head" aria-expanded={deep} onClick={onDeep}>
          <span>Go deeper</span>
          <span className="st-deep-sub muted small">Form and function, relations, development, variations, clinical reasoning, tutorial questions</span>
          <ChevronIcon className="lc-chev" />
        </button>
      </section>
      {deep && (
        <div className="st-deep-body">
          <Section n={4} title="Form → function" id={`${p}-s4`} simpler={{ f: s.formFunction.simpler, pid: `${p}-ff-simpler` }}>
            <Facts facts={s.formFunction.facts} pid={`${p}-ff`} />
          </Section>
          <Section n={5} title="Relations" id={`${p}-s5`} simpler={{ f: s.relations.simpler, pid: `${p}-rel-simpler` }}>
            <Named items={s.relations.items} pid={`${p}-rel`} tag />
          </Section>
          <Section n={6} title="Development" id={`${p}-s6`}>
            <Facts facts={s.development.facts} pid={`${p}-dev`} />
          </Section>
          <Section n={7} title="Variations" id={`${p}-s7`}>
            {s.variations.facts.length ? <Facts facts={s.variations.facts} pid={`${p}-var`} /> : <p className="muted">No variations from an approved source yet.</p>}
          </Section>
          <Section n={8} title="Clinical reasoning" id={`${p}-s8`}>
            <Clinical s={s} />
          </Section>
          <Section n={9} title="Tutorial questions" id={`${p}-s9`}>
            <Tutorials s={s} />
          </Section>
        </div>
      )}
    </>
  )
}

/** Injury → structure damaged → what the patient cannot do → why. */
function Clinical({ s }: { s: Structure }) {
  const pieces = useTerms(s.clinical.items.flatMap((c) => [c.injury, c.damaged, c.cannotDo, c.why]))
  const ROWS = ['Injury', 'Damaged', 'Cannot', 'Why'] as const
  return (
    <ol className="st-clinical">
      {s.clinical.items.map((c, k) => (
        <li key={k} data-pid={`${s.id}-clin-${k}`}>
          {ROWS.map((label, r) => (
            <p key={label} className={`st-step st-step-${r}`}>
              <span className="k">{label === 'Cannot' ? 'Patient can’t' : label}</span>
              <span>
                <Pieces pieces={pieces[4 * k + r]} />
                {r === 3 && <Dagger f={c} />}
              </span>
            </p>
          ))}
        </li>
      ))}
    </ol>
  )
}

function Tutorials({ s }: { s: Structure }) {
  const [shown, setShown] = useState<Set<number>>(new Set())
  const pieces = useTerms(s.tutorial.items.map((t) => t.q))
  return (
    <ol className="st-tutorials">
      {s.tutorial.items.map((t, k) => (
        <li key={k} data-pid={`${s.id}-tut-${k}`}>
          <span className="tag st-tut-kind">{TUTORIAL_NAME[t.kind]}</span>
          <p className="st-tut-q">
            <Pieces pieces={pieces[k]} />
            <Dagger f={t} />
          </p>
          {shown.has(k) ? (
            <div className="q-model st-model">
              <h3>Model answer</h3>
              <ul>
                {t.model.map((m, j) => (
                  <li key={j}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <button
              className="btn ghost small"
              onClick={() => {
                tap()
                setShown((x) => new Set(x).add(k))
              }}
            >
              Think, then show the model answer
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Three questions at the end, answered on the page. */
function Check({ s }: { s: Structure }) {
  const [chosen, setChosen] = useState<(number | null)[]>(() => s.check.map(() => null))
  const done = chosen.filter((c) => c !== null).length
  const right = chosen.filter((c, k) => c === s.check[k].answer).length
  return (
    <section className="st-check" aria-labelledby={`${s.id}-check`}>
      <h2 id={`${s.id}-check`}>Check yourself</h2>
      <p className="muted small">{done === s.check.length ? `${right} of ${s.check.length} right.` : `${s.check.length} questions on this lesson.`}</p>
      <ol>
        {s.check.map((q, k) => {
          const c = chosen[k]
          return (
            <li key={k}>
              <p className="st-check-q">{q.stem}</p>
              <div className="q-options" role="group" aria-label="Answers">
                {q.options.map((o, j) => {
                  const state = c === null ? '' : j === q.answer ? 'right' : j === c ? 'wrong' : 'dim'
                  return (
                    <button
                      key={j}
                      className={`qc-opt ${state}`}
                      disabled={c !== null}
                      onClick={() => {
                        haptic(j === q.answer ? 'light' : 'medium')
                        setChosen((x) => x.map((v, i) => (i === k ? j : v)))
                      }}
                    >
                      <span className="qc-letter">{LETTERS[j]}</span>
                      <span>{o}</span>
                    </button>
                  )
                })}
              </div>
              {c !== null && (
                <p className={`q-verdict st-why ${c === q.answer ? 'good' : 'bad'}`} role="status">
                  {c === q.answer ? '✓ Correct. ' : `Not quite: ${LETTERS[q.answer]}. `}
                  <span className="st-why-t">{q.why}</span>
                </p>
              )}
            </li>
          )
        })}
      </ol>
      {done > 0 && (
        <button className="link-btn" onClick={() => setChosen(s.check.map(() => null))}>
          Start again
        </button>
      )}
    </section>
  )
}

/** See in 3D, the flashcards and the exam-style questions on this structure. */
function Links({ s, name }: { s: Structure; name: string }) {
  const showBone = useNav((x) => x.showBone)
  const push = useNav((x) => x.push)
  const cards = LAYERED.filter((c) => c.bone === s.bone).length
  const questions = QUESTIONS.filter((q) => q.bone === s.bone)
  return (
    <div className="st-links">
      <button className="chip st-link" onClick={() => showBone(s.bone, name)}>
        <CubeIcon /> See in 3D
      </button>
      {cards > 0 && (
        <button className="chip st-link" onClick={() => useSession.getState().open('layered', { bone: s.bone })}>
          <CardsIcon /> {cards} {cards === 1 ? 'flashcard' : 'flashcards'}
        </button>
      )}
      {questions.length > 0 && (
        <button
          className="chip st-link"
          onClick={() =>
            push({
              kind: 'topic',
              area: 'exam',
              topic: questions[0].topic,
              anchor: questions[0].id,
            })
          }
        >
          <QuestionIcon /> {questions.length} exam {questions.length === 1 ? 'question' : 'questions'}
        </button>
      )}
    </div>
  )
}

function Foot({ s }: { s: Structure }) {
  const checks = needsReview(s)
  return (
    <div className="q-foot st-foot">
      <p className="q-source">
        {s.source}
        <span className="review draft">{s.reviewStatus === 'reviewed' ? 'Reviewed' : 'Draft, awaiting academic review'}</span>
      </p>
      {checks.length > 0 && <p className="q-source lc-check-note">† Awaiting a source check before review.</p>}
      <p className="q-source">Definitions: OpenStax Anatomy and Physiology 2e glossary (CC BY 4.0).</p>
    </div>
  )
}

function TermSheet({ entry, onClose }: { entry: GlossaryEntry; onClose: () => void }) {
  const canSay = typeof speechSynthesis !== 'undefined'
  const meaning = entry.meaning.charAt(0).toUpperCase() + entry.meaning.slice(1)
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <aside className="sheet term-sheet" role="dialog" aria-modal aria-label={entry.term} onClick={(e) => e.stopPropagation()}>
          <p className="eyebrow">Definition</p>
          <h2>{entry.term}</h2>
          <p>{/[.!?]$/.test(meaning) ? meaning : `${meaning}.`}</p>
          <p className="muted small">{`OpenStax A&P 2e glossary, section ${entry.section}`}</p>
          <div className="modal-actions">
            {canSay && (
              <button className="btn ghost" onClick={() => pronounce(entry.term)}>
                Say it
              </button>
            )}
            <button className="btn primary" onClick={onClose}>
              Done
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  )
}
