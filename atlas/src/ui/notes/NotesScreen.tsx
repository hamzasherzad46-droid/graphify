import { useEffect, useRef, useState } from 'react'
import { PageHead } from '../lessons/PageHead'
import { Chips } from '../lessons/ExamQuestions'
import { Portal } from '../Portal'
import { CameraIcon, ChevronRightIcon, CloseIcon, NotesIcon, UploadIcon } from '../Icons'
import { CameraSheet } from './CameraSheet'
import { useNav } from '../../state/nav'
import { haptic } from '../../lib/feedback'
import type { PagePhoto } from '../../lib/image'
import { LEVEL_LABEL, isDone, useExam, type Level } from '../../learn/questions'
import { apiReady, LIMITS, NotesError, requestSet, sortedSets, toQuestions, useNoteSets, type NotesSettings, type ServerResult, type Stage } from '../../learn/notesExam'
import { notesForQuestions, readingState, refsText, shortName, topicsByFile, useNoteDocs, NOT_FOR_QUESTIONS, type NoteDoc } from '../../learn/notesDocs'
import { count, docStatus, KIND_LABEL } from './docStatus'

const SETTINGS_KEY = 'atlas.notes.settings'
const CONSENT_KEY = 'atlas.notes.consent'
const DEFAULTS: NotesSettings = { count: 10, level: 'undergraduate', mix: 'mixed' }
/** Pages a camera session can take. */
const CAMERA_PAGES = 40
const ACCEPT =
  '.pdf,.pptx,.docx,.txt,.md,image/*,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function loadSettings(): NotesSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<NotesSettings>) }
  } catch {
    return DEFAULTS
  }
}

type Phase = { kind: 'compose' } | { kind: 'working'; stage: Stage; started: number } | { kind: 'error'; message: string } | { kind: 'not-used'; result: ServerResult }

const STEPS: { stage: Stage; label: string; detail: string }[] = [
  { stage: 'sending', label: 'Sending your notes', detail: 'Securely, to the Atlas question service.' },
  { stage: 'reading', label: 'Writing questions', detail: 'Questions on exactly what your material says, each linked to where it comes from.' },
  { stage: 'checking', label: 'Examiner checking', detail: 'A second examiner checks every answer and explanation, and fixes or removes any that are not sound.' },
]

/**
 * Notes to Exam. 1 Add your material: photos, PDFs, PowerPoint (with speaker notes), Word or typed notes. Atlas reads
 * it (on this device where it can) and shows how far it has got. 2 Check the text. 3 Choose topics. 4 Get questions.
 */
export function NotesScreen() {
  const docs = useNoteDocs((s) => s.docs)
  const topics = useNoteDocs((s) => s.topics)
  const readError = useNoteDocs((s) => s.readError)
  const [settings, setSettings] = useState<NotesSettings>(loadSettings)
  const [camera, setCamera] = useState(false)
  const [shots, setShots] = useState<PagePhoto[]>([])
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const [consent, setConsent] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'compose' })
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const abort = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const sets = useNoteSets((s) => s.sets)
  const ready = apiReady()

  useEffect(() => {
    void useNoteDocs.getState().load()
    return () => abort.current?.abort()
  }, [])

  const change = (s: Partial<NotesSettings>) => {
    const next = { ...settings, ...s }
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* private mode: settings last for this visit */
    }
  }

  const addFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])]
    if (!files.length) return
    haptic('light')
    setFileErrors(await useNoteDocs.getState().addFiles(files))
  }

  const closeCamera = () => {
    setCamera(false)
    useNoteDocs.getState().addPhotos(shots)
    shots.forEach((p) => URL.revokeObjectURL(p.url))
    setShots([])
  }

  const r = readingState(docs)
  const busyReading = r.opening || r.waiting > 0
  const chosenTopics = topics ?? topicsByFile(docs)
  const text = notesForQuestions(docs, chosenTopics)
  const tooLong = text.length > LIMITS.textChars
  const canSend = ready && !busyReading && text.trim().length > 0 && !tooLong

  const send = async () => {
    if (!canSend) return
    if (localStorage.getItem(CONSENT_KEY) !== '1') return setConsent(true)
    haptic('light')
    const ctrl = new AbortController()
    abort.current = ctrl
    setPhase({ kind: 'working', stage: 'sending', started: Date.now() })
    try {
      const res = await requestSet({ images: [], text }, settings, (stage) => setPhase((ph) => (ph.kind === 'working' ? { ...ph, stage } : ph)), ctrl.signal)
      if (res.status !== 'ok') return setPhase({ kind: 'not-used', result: res })
      const id = crypto.randomUUID().slice(0, 8)
      await useNoteSets.getState().save({
        id,
        title: res.title,
        createdAt: new Date().toISOString(),
        settings,
        from: { pages: 0, pdf: false, typed: false, files: docs.map((d) => shortName(d.name)) },
        transcript: res.transcript,
        corrections: res.corrections,
        questions: toQuestions(id, res.questions),
        review: res.review,
      })
      haptic('success')
      setPhase({ kind: 'compose' })
      useNav.getState().push({ kind: 'noteset', id })
    } catch (e) {
      if (ctrl.signal.aborted) return setPhase({ kind: 'compose' })
      setPhase({ kind: 'error', message: e instanceof NotesError ? e.message : 'Something went wrong. Please try again.' })
    } finally {
      abort.current = null
    }
  }

  if (phase.kind === 'working')
    return (
      <Working
        stage={phase.stage}
        started={phase.started}
        onCancel={() => {
          abort.current?.abort()
          setPhase({ kind: 'compose' })
        }}
      />
    )

  return (
    <div className="tab-page lessons notes">
      <PageHead title="Notes to Exam" />
      <div className="page-body">
        <p className="notes-intro">
          Add your lecture slides, handouts or notes. Atlas reads them, sorts them into topics and sets exam-style questions on exactly what they say; a second examiner checks every answer.
        </p>

        {!ready && (
          <div className="notes-banner" role="note">
            <strong>Not connected in this preview.</strong> Atlas can open your files and show their text, but reading photos, finding topics and writing questions need the Atlas question service,
            which is not set up on this copy of the app.
          </div>
        )}
        {phase.kind === 'error' && (
          <div className="notes-banner bad" role="alert">
            <strong>The questions could not be written.</strong> {phase.message}
          </div>
        )}
        {phase.kind === 'not-used' && (
          <div className="notes-banner bad" role="alert">
            <strong>{phase.result.status === 'unreadable' ? 'Atlas could not read these notes.' : 'These do not look like anatomy notes.'}</strong> {phase.result.message}
          </div>
        )}

        <section className="notes-capture" aria-labelledby="notes-step-1">
          <h3 id="notes-step-1" className="notes-step">
            <span className="st-n">1</span> Your material
          </h3>
          <div className="capture-actions">
            <button
              className="capture-btn primary"
              onClick={() => {
                haptic('light')
                setCamera(true)
              }}
            >
              <CameraIcon />
              <span>Take photos</span>
            </button>
            <button className="capture-btn" onClick={() => fileInput.current?.click()}>
              <UploadIcon />
              <span>Add files</span>
            </button>
            <button className="capture-btn" onClick={() => setTyping((t) => !t)} aria-expanded={typing}>
              <NotesIcon />
              <span>Type notes</span>
            </button>
          </div>
          <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (void addFiles(e.target.files), (e.target.value = ''))} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => (void addFiles(e.target.files), (e.target.value = ''))} />
          {fileErrors.map((m) => (
            <p key={m} className="field-error" role="alert">
              {m}
            </p>
          ))}

          {typing && (
            <label className="field notes-text">
              <span>Typed notes</span>
              <textarea rows={6} value={typed} placeholder="Type or paste your notes here." onChange={(e) => setTyped(e.target.value)} />
              <button
                className="btn ghost small"
                disabled={!typed.trim()}
                onClick={() => {
                  useNoteDocs.getState().addTyped(typed)
                  setTyped('')
                  setTyping(false)
                }}
              >
                Add these notes
              </button>
            </label>
          )}

          {docs.length > 0 ? (
            <>
              <ul className="doc-list" aria-label="Your files">
                {docs.map((d) => (
                  <DocRow key={d.id} d={d} />
                ))}
              </ul>
              <ReadingSummary />
              {readError && (
                <div className="notes-banner bad" role="alert">
                  <strong>Some pages could not be read.</strong> {readError}{' '}
                  <button className="link-btn" onClick={() => useNoteDocs.getState().retry()}>
                    Try again
                  </button>
                </div>
              )}
              <button className="link-btn clear-docs" onClick={() => setConfirmClear(true)}>
                Remove all files
              </button>
            </>
          ) : (
            <ul className="notes-tips">
              <li>PDF, PowerPoint (.pptx, with speaker notes), Word (.docx), photos and text files. Add several at once.</li>
              <li>Photos: one page per photo, flat, in good even light. Handwriting and diagram labels are read too.</li>
              <li>PDF files, slides and Word files are read on this device. Only photos and scanned pages are sent to be read.</li>
            </ul>
          )}
        </section>

        {docs.length > 0 && (
          <section className="notes-topics" aria-labelledby="notes-step-2">
            <h3 id="notes-step-2" className="notes-step">
              <span className="st-n">2</span> Topics
            </h3>
            <Topics busy={busyReading} />
          </section>
        )}

        <section className="notes-options" aria-labelledby="notes-step-3">
          <h3 id="notes-step-3" className="notes-step">
            <span className="st-n">{docs.length ? 3 : 2}</span> Questions
          </h3>
          <h4>Number of questions</h4>
          <Chips
            label="Number of questions"
            value={String(settings.count)}
            options={[
              ['5', '5'],
              ['10', '10'],
              ['15', '15'],
            ]}
            onChange={(v) => change({ count: Number(v) as NotesSettings['count'] })}
          />
          <h4>Level</h4>
          <Chips label="Level" value={settings.level} options={Object.entries(LEVEL_LABEL) as [Level, string][]} onChange={(level) => change({ level })} />
          <h4>Question types</h4>
          <Chips
            label="Question types"
            value={settings.mix}
            options={[
              ['mixed', 'Mixed'],
              ['sba', 'Single best answer only'],
            ]}
            onChange={(mix) => change({ mix })}
          />
          <p className="muted small options-hint">
            {settings.mix === 'mixed' ? 'Mostly single best answer, with about one short-answer question in four.' : 'Every question has four options and one best answer.'}
          </p>
        </section>

        {tooLong && <p className="field-error">The chosen topics are more than one set can use. Choose fewer topics for this set.</p>}
        <button className="btn primary wide notes-send" disabled={!canSend} onClick={send}>
          {busyReading ? 'Reading your material…' : 'Write my exam questions'}
        </button>
        <p className="muted small notes-privacy">
          PDF files, slides and Word files are read on this device. Photos and scanned pages, and the text of the topics you choose, are sent to the Atlas question service, which uses Claude (by
          Anthropic). Nothing you send is stored there; your files’ text and your questions are saved on this device only.
        </p>

        <SavedSets sets={sortedSets(sets)} />
      </div>

      {camera && (
        <CameraSheet
          pages={shots}
          max={CAMERA_PAGES}
          onAdd={(p) => setShots((s) => [...s, p])}
          onClose={closeCamera}
          onFallback={() => {
            closeCamera()
            cameraInput.current?.click()
          }}
        />
      )}
      {consent && (
        <Consent
          onCancel={() => setConsent(false)}
          onAgree={() => {
            try {
              localStorage.setItem(CONSENT_KEY, '1')
            } catch {
              /* asked again next time */
            }
            setConsent(false)
            void send()
          }}
        />
      )}
      {confirmClear && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setConfirmClear(false)}>
            <aside className="sheet" role="dialog" aria-modal aria-label="Remove all files?" onClick={(e) => e.stopPropagation()}>
              <h2>Remove all files?</h2>
              <p className="muted">Their text and topics are removed from this device. Question sets you have made stay.</p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setConfirmClear(false)}>
                  Keep them
                </button>
                <button
                  className="btn danger"
                  onClick={() => {
                    void useNoteDocs.getState().clear()
                    setConfirmClear(false)
                  }}
                >
                  Remove
                </button>
              </div>
            </aside>
          </div>
        </Portal>
      )}
    </div>
  )
}

function DocRow({ d }: { d: NoteDoc }) {
  const s = docStatus(d)
  return (
    <li className="doc-row">
      <button className="topic-row doc-open" disabled={d.stage !== 'done'} onClick={() => useNav.getState().push({ kind: 'notesdoc', id: d.id })} aria-label={`${d.name}: check the text`}>
        <span className={`doc-kind k-${d.kind}`} aria-hidden>
          {KIND_LABEL[d.kind]}
        </span>
        <span className="topic-text">
          <span className="topic-title">{shortName(d.name)}</span>
          <span className={`topic-blurb ${s.tone}`}>{s.line}</span>
          {s.progress !== null && (
            <span className="row-progress" aria-hidden>
              <span style={{ transform: `scaleX(${s.progress})` }} />
            </span>
          )}
        </span>
        {d.stage === 'done' && <ChevronRightIcon className="topic-go" />}
      </button>
      <button className="icon-btn doc-remove" aria-label={`Remove ${d.name}`} onClick={() => useNoteDocs.getState().removeDoc(d.id)}>
        <CloseIcon />
      </button>
    </li>
  )
}

function ReadingSummary() {
  const docs = useNoteDocs((s) => s.docs)
  const r = readingState(docs)
  if (r.opening || r.waiting)
    return (
      <p className="muted small reading-note" role="status">
        Atlas is reading your material. You can keep adding files.
      </p>
    )
  if (r.illegible || r.partly)
    return (
      <p className="small reading-note warn" role="status">
        {r.illegible ? `${count(r.illegible, ['page', 'pages'])} could not be read. ` : ''}
        {r.partly ? `${count(r.partly, ['page has', 'pages have'])} words Atlas could not read, marked [illegible]. ` : ''}
        Open a file to check its text and correct it.
      </p>
    )
  return null
}

function Topics({ busy }: { busy: boolean }) {
  const docs = useNoteDocs((s) => s.docs)
  const topics = useNoteDocs((s) => s.topics)
  const state = useNoteDocs((s) => s.topicsState)
  const store = useNoteDocs.getState()
  const parts = new Map(docs.flatMap((d) => d.parts.map((p) => [p.id, { d, p }] as const)))

  if (!topics)
    return (
      <div className="topics-empty">
        <p className="muted small">Atlas sorts your material into the topics it covers. Then you choose which topics to be examined on.</p>
        {typeof state === 'object' && (
          <p className="field-error" role="alert">
            {state.error}
          </p>
        )}
        <div className="topics-actions">
          <button className="btn ghost" disabled={busy || state === 'working' || !apiReady()} onClick={() => void store.findTopics()}>
            {state === 'working' ? 'Finding topics…' : busy ? 'Waiting for reading to finish' : 'Find topics'}
          </button>
          <button className="link-btn" disabled={busy} onClick={store.useFiles}>
            Use whole files instead
          </button>
        </div>
      </div>
    )

  const chosen = topics.filter((t) => t.chosen).length
  return (
    <>
      <p className="muted small">
        {chosen} of {count(topics.length, ['topic', 'topics'])} chosen for questions.
      </p>
      <ul className="topic-checks">
        {topics.map((t) => {
          const ps = t.parts.map((id) => parts.get(id)).filter((x) => !!x)
          const files = [...new Set(ps.map((x) => x.d.id))]
          const where = files
            .map((f) => {
              const inFile = ps.filter((x) => x.d.id === f)
              return docs.length > 1 ? `${shortName(inFile[0].d.name)}: ${refsText(inFile.map((x) => x.p))}` : refsText(inFile.map((x) => x.p))
            })
            .join('; ')
          return (
            <li key={t.id}>
              <label className={`topic-check ${t.chosen ? 'on' : ''} ${t.title === NOT_FOR_QUESTIONS ? 'skip' : ''}`}>
                <input type="checkbox" checked={t.chosen} onChange={() => store.toggleTopic(t.id)} />
                <span className="topic-text">
                  <span className="topic-title">{t.title}</span>
                  {t.summary && <span className="topic-blurb">{t.summary}</span>}
                  <span className="topic-where">{where}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <button className="link-btn" onClick={store.clearTopics}>
        Sort into topics again
      </button>
    </>
  )
}

/** Shown before the first set: what is sent, to whom, and what is kept. */
function Consent({ onAgree, onCancel }: { onAgree: () => void; onCancel: () => void }) {
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onCancel}>
        <aside className="sheet" role="dialog" aria-modal aria-label="Before you send your notes" onClick={(e) => e.stopPropagation()}>
          <h2>Before you send your notes</h2>
          <ul className="consent-list">
            <li>
              Your photos, PDF or typed notes are sent over an encrypted connection to the Atlas question service, which uses Claude, an AI model made by Anthropic, to read them and write the
              questions.
            </li>
            <li>Atlas does not store your photos. The questions, and the text read from your notes, are saved on this device only.</li>
            <li>Do not include anything private, such as patient details or other people’s personal information.</li>
            <li>The questions are written and checked by AI, not by an academic. If anything disagrees with your lecture notes or textbook, trust those.</li>
          </ul>
          <div className="modal-actions">
            <button className="btn ghost" onClick={onCancel}>
              Not now
            </button>
            <button className="btn primary" onClick={onAgree}>
              Send my notes
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  )
}

/** While the set is written: the three steps, the time so far, and a way to stop. */
function Working({ stage, started, onCancel }: { stage: Stage; started: number; onCancel: () => void }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setSecs(Math.max(0, Math.round((Date.now() - started) / 1000))), 1000)
    return () => window.clearInterval(t)
  }, [started])
  const at = STEPS.findIndex((s) => s.stage === stage)
  return (
    <div className="tab-page lessons notes">
      <PageHead title="Notes to Exam" />
      <div className="page-body">
        <div className="working" role="status" aria-live="polite">
          <div className="working-mark" aria-hidden>
            <span />
          </div>
          <h2>Writing your exam questions</h2>
          <p className="muted">This usually takes one to three minutes. Keep Atlas open.</p>
          <ol className="working-steps">
            {STEPS.map((s, k) => (
              <li key={s.stage} className={k < at ? 'done' : k === at ? 'now' : ''}>
                <span className="step-dot" aria-hidden />
                <span className="step-text">
                  <span className="step-label">
                    {s.label}
                    {k < at && <span className="sr-only"> (done)</span>}
                  </span>
                  {k === at && <span className="step-detail">{s.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
          <p className="working-time muted small">
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </p>
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function SavedSets({ sets }: { sets: ReturnType<typeof sortedSets> }) {
  const answers = useExam((s) => s.answers)
  if (!sets.length) return null
  return (
    <section className="saved-sets" aria-label="Your question sets">
      <h3>Your question sets</h3>
      <ul className="topic-list">
        {sets.map((s) => {
          const done = s.questions.filter((q) => isDone(q, answers[q.id])).length
          return (
            <li key={s.id}>
              <button className="topic-row" onClick={() => useNav.getState().push({ kind: 'noteset', id: s.id })}>
                <span className="topic-text">
                  <span className="topic-title">{s.title}</span>
                  <span className="topic-blurb">
                    {s.questions.length} questions · {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
                    {done === s.questions.length ? 'All answered' : done ? `${done} answered` : 'Not started'}
                  </span>
                </span>
                <ChevronRightIcon className="topic-go" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
