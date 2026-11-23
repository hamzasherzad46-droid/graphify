import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { figureUrl, loadSection, plain, sectionLabel, useReading, type Block, type ChoiceQuestion, type Section } from '../../learn/textbook'
import { useNav } from '../../state/nav'
import { usePrefs, type Theme } from '../../state/store'
import { haptic } from '../../lib/feedback'
import { PageHead } from './PageHead'
import { Rich } from './Rich'
import { FigureZoom } from './FigureZoom'

const SIZES = [15, 16, 17.5, 19, 21]
/** Height of the sticky header: a paragraph this far from the top is the one being read. */
const TOP = 70

/** The textbook reader: key points, the full text, key terms, a quick check and the attribution. */
export function ReaderScreen({ id }: { id: string }) {
  const [section, setSection] = useState<Section | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    loadSection(id).then(setSection, () => setFailed(true))
  }, [id])
  if (failed) return <div className="tab-page lessons"><PageHead title="Not found" /></div>
  if (!section) return <div className="tab-page lessons reader-page" aria-busy />
  return <Reader section={section} />
}

function Reader({ section }: { section: Section }) {
  const size = useReading((s) => s.size)
  const [menu, setMenu] = useState(false)
  const [zoom, setZoom] = useState<Extract<Block, { t: 'fig' }> | null>(null)
  const [frac, setFrac] = useState(0)
  const page = useRef<HTMLDivElement>(null)
  const label = sectionLabel(section)

  const onBone = (bone: string) => {
    haptic('light')
    useNav.getState().showBone(bone, label)
  }
  const onRef = (to: string) => document.getElementById(to)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Back to where the student left off: the paragraph that was at the top of the screen (once per opening).
  const restored = useRef(false)
  useLayoutEffect(() => {
    const el = page.current
    if (restored.current || !el) return
    restored.current = true
    const m = useReading.getState().marks[section.id]
    if (!m) return
    const p = m.para ? document.getElementById(m.para) : null
    if (p) el.scrollTop = p.offsetTop - TOP
    else if (m.frac > 0) el.scrollTop = m.frac * (el.scrollHeight - el.clientHeight)
  }, [section.id])

  // Save progress while reading (a few times a second at most).
  useEffect(() => {
    const el = page.current
    if (!el) return
    let raf = 0
    let last = 0
    const save = () => {
      raf = 0
      const f = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 1
      setFrac(f)
      const now = performance.now()
      if (now - last < 400) return
      last = now
      // The paragraph at the top of the screen, under the header (none while still above the text).
      let para: string | null = null
      for (const p of el.querySelectorAll<HTMLElement>('[data-pid]')) {
        if (p.offsetTop <= el.scrollTop + TOP + 1) para = p.dataset.pid ?? null
        else break
      }
      useReading.getState().mark(section.id, { frac: f, para })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(save)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [section.id])

  return (
    <div className="tab-page lessons reader-page" ref={page} style={{ ['--rs' as string]: `${size}px` }}>
      <PageHead eyebrow={`Chapter ${section.chapter.num} · ${section.chapter.title}`} title={label}>
        <button className="icon-btn aa" aria-label="Text size and theme" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          Aa
        </button>
      </PageHead>
      <div className="read-progress" aria-hidden>
        <span style={{ transform: `scaleX(${frac})` }} />
      </div>
      {menu && <ReaderMenu onClose={() => setMenu(false)} />}

      <article className="reader">
        <p className="eyebrow">{section.num.includes('.') ? `Section ${section.num}` : `Chapter ${section.num}`}</p>
        <h1 className="reader-title">{section.num.includes('.') ? section.title : section.chapter.title}</h1>

        {section.keyPoints.length > 0 && <KeyPoints section={section} onBone={onBone} />}
        {section.objectives.length > 0 && (
          <details className="objectives">
            <summary>Learning objectives</summary>
            <p className="muted">By the end of this section, you will be able to:</p>
            <ul>
              {section.objectives.map((o, k) => (
                <li key={k}>
                  <Rich inl={o} onBone={onBone} />
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="reader-body">
          <Blocks blocks={section.blocks} onBone={onBone} onRef={onRef} onZoom={setZoom} />
        </div>

        {section.glossary.length > 0 && (
          <details className="glossary">
            <summary>Key terms ({section.glossary.length})</summary>
            <dl>
              {section.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.meaning}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {section.quickCheck.length > 0 && <QuickCheck questions={section.quickCheck} />}

        <footer className="attribution">
          <p>
            Adapted from <em>Anatomy and Physiology 2e</em> by OpenStax, CC BY 4.0, openstax.org.
          </p>
          <p className="muted small">
            Source: the book’s published source at commit {section.source.commit.slice(0, 7)} (module {section.source.module}), the last version released under CC BY 4.0
            (creativecommons.org/licenses/by/4.0).
          </p>
          <p className="muted small">Changes made:</p>
          <ul className="muted small">
            {section.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </footer>
      </article>
      {zoom && <FigureZoom src={figureUrl(zoom.src)} alt={zoom.alt} label={zoom.label} title={zoom.title} onClose={() => setZoom(null)} />}
    </div>
  )
}

function KeyPoints({ section, onBone }: { section: Section; onBone: (b: string) => void }) {
  const [more, setMore] = useState(false)
  return (
    <section className="key-points" aria-label="Key points">
      <h2>Key points</h2>
      <ul>
        {section.keyPoints.map((k) => (
          <li key={k.id}>
            <Rich inl={k.lead} onBone={onBone} />
            {more && k.rest.length > 0 && (
              <span className="kp-rest">
                {' '}
                <Rich inl={k.rest} onBone={onBone} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {section.keyPoints.some((k) => k.rest.length) && (
        <button className="link-btn" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          {more ? 'Show less' : 'Show the full summary'}
        </button>
      )}
    </section>
  )
}

function Blocks({ blocks, onBone, onRef, onZoom }: { blocks: Block[]; onBone: (b: string) => void; onRef: (to: string) => void; onZoom: (f: Extract<Block, { t: 'fig' }>) => void }) {
  return (
    <>
      {blocks.map((b) => {
        switch (b.t) {
          case 'h': {
            const H = `h${Math.min(b.level, 4)}` as 'h2' | 'h3' | 'h4'
            return (
              <H key={b.id} id={b.id} className="rh">
                {b.text}
              </H>
            )
          }
          case 'p':
            return (
              <p key={b.id} id={b.id} data-pid={b.id}>
                <Rich inl={b.inl} onBone={onBone} onRef={onRef} />
              </p>
            )
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul'
            return (
              <L key={b.id} id={b.id} data-pid={b.id}>
                {b.items.map((it, k) => (
                  <li key={k}>
                    <Rich inl={it} onBone={onBone} onRef={onRef} />
                  </li>
                ))}
              </L>
            )
          }
          case 'fig':
            return (
              <figure key={b.id} id={b.id} className="rfig">
                <button type="button" className="rfig-img" onClick={() => onZoom(b)} aria-label={`Zoom ${b.label}: ${b.title}`}>
                  <img src={figureUrl(b.src)} alt={b.alt} loading="lazy" decoding="async" />
                </button>
                <figcaption data-pid={b.id}>
                  <strong>
                    {b.label} {b.title}
                  </strong>{' '}
                  <Rich inl={b.caption} onBone={onBone} onRef={onRef} />
                </figcaption>
              </figure>
            )
          case 'table':
            return (
              <figure key={b.id} id={b.id} className="rtable">
                <figcaption>
                  <strong>{b.label}</strong> {b.title}
                </figcaption>
                <div className="rtable-scroll">
                  <table>
                    {b.head.length > 0 && (
                      <thead>
                        {b.head.map((r, i) => (
                          <tr key={i}>
                            {r.map((c, j) => (
                              <th key={j}>
                                <Rich inl={c} onBone={onBone} />
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                    )}
                    <tbody>
                      {b.rows.map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td key={j}>
                              <Rich inl={c} onBone={onBone} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            )
          case 'note':
            return (
              <aside key={b.id} id={b.id} className={`rnote ${b.kind}`}>
                <p className="rnote-head">
                  {b.label && <span className="rnote-kind">{b.label}</span>} {b.title}
                </p>
                <Blocks blocks={b.blocks} onBone={onBone} onRef={onRef} onZoom={onZoom} />
              </aside>
            )
          default:
            return null
        }
      })}
    </>
  )
}

const LETTERS = 'ABCDEFG'

/** Three review questions from the end of the section, answered in place. */
function QuickCheck({ questions }: { questions: ChoiceQuestion[] }) {
  const checks = useReading((s) => s.checks)
  const answered = questions.filter((q) => checks[q.id] !== undefined)
  const right = answered.filter((q) => checks[q.id] === q.answer).length
  return (
    <section className="quick-check" aria-label="Quick check">
      <h2>Quick check</h2>
      <p className="muted small">{answered.length === questions.length ? `${right} of ${questions.length} correct` : `${questions.length} questions from the end of this section`}</p>
      <ol>
        {questions.map((q) => {
          const chosen = checks[q.id]
          const done = chosen !== undefined
          return (
            <li key={q.id} className="qc">
              <p className="qc-stem">
                <Rich inl={q.stem} />
              </p>
              <div className="qc-options" role="group">
                {q.options.map((o, k) => {
                  const state = !done ? '' : k === q.answer ? 'right' : k === chosen ? 'wrong' : 'dim'
                  return (
                    <button
                      key={k}
                      className={`qc-opt ${state}`}
                      disabled={done}
                      onClick={() => {
                        haptic(k === q.answer ? 'success' : 'medium')
                        useReading.getState().answer(q.id, k)
                      }}
                    >
                      <span className="qc-letter">{LETTERS[k]}</span>
                      <span>
                        <Rich inl={o} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {done && (
                <p className={`qc-verdict ${chosen === q.answer ? 'good' : 'bad'}`} role="status">
                  {chosen === q.answer ? 'Correct.' : `Not quite. The answer is ${LETTERS[q.answer]}: ${plain(q.options[q.answer])}.`}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      {answered.length > 0 && (
        <button className="link-btn" onClick={() => useReading.getState().reset(questions.map((q) => q.id))}>
          Try again
        </button>
      )}
    </section>
  )
}

function ReaderMenu({ onClose }: { onClose: () => void }) {
  const size = useReading((s) => s.size)
  const theme = usePrefs((s) => s.theme)
  const i = SIZES.indexOf(size) < 0 ? 2 : SIZES.indexOf(size)
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="reader-menu" role="dialog" aria-label="Reading settings">
        <div className="row">
          <span>Text size</span>
          <div className="segmented small">
            <button aria-label="Smaller text" disabled={i === 0} onClick={() => useReading.getState().setSize(SIZES[i - 1])}>
              A−
            </button>
            <span className="size-now">{Math.round((SIZES[i] / 17.5) * 100)}%</span>
            <button aria-label="Larger text" disabled={i === SIZES.length - 1} onClick={() => useReading.getState().setSize(SIZES[i + 1])}>
              A+
            </button>
          </div>
        </div>
        <div className="row">
          <span>Theme</span>
          <div className="segmented small" role="radiogroup" aria-label="Theme">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? 'on' : ''} onClick={() => usePrefs.getState().setTheme(t)}>
                {t === 'system' ? 'Auto' : t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
