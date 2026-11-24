import { useEffect, useRef, useState } from 'react'
import { PageHead } from '../lessons/PageHead'
import { Chips } from '../lessons/ExamQuestions'
import { Portal } from '../Portal'
import { CameraIcon, ChevronRightIcon, CloseIcon, NotesIcon, UploadIcon } from '../Icons'
import { CameraSheet } from './CameraSheet'
import { useNav } from '../../state/nav'
import { haptic } from '../../lib/feedback'
import { photoFromFile, toBase64, type PagePhoto } from '../../lib/image'
import { LEVEL_LABEL, isDone, useExam, type Level } from '../../learn/questions'
import { apiReady, LIMITS, NotesError, requestSet, sortedSets, toQuestions, useNoteSets, type NotesSettings, type ServerResult, type Stage } from '../../learn/notesExam'

const SETTINGS_KEY = 'atlas.notes.settings'
const CONSENT_KEY = 'atlas.notes.consent'
const DEFAULTS: NotesSettings = { count: 10, level: 'undergraduate', mix: 'mixed' }

function loadSettings(): NotesSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<NotesSettings>) }
  } catch {
    return DEFAULTS
  }
}

type Pdf = { name: string; size: number; data: string }
type Phase = { kind: 'compose' } | { kind: 'working'; stage: Stage; started: number } | { kind: 'error'; message: string } | { kind: 'not-used'; result: ServerResult }

const STEPS: { stage: Stage; label: string; detail: string }[] = [
  { stage: 'sending', label: 'Sending your notes', detail: 'Securely, to the Atlas question service.' },
  { stage: 'reading', label: 'Reading your notes', detail: 'Transcribing every page and writing questions on what you wrote.' },
  { stage: 'checking', label: 'Examiner checking', detail: 'A second examiner checks every answer and explanation, and fixes or removes any that are not sound.' },
]

/** Notes to Exam: photograph, upload or type your notes; get exam-style questions on exactly what you wrote. */
export function NotesScreen() {
  const [pages, setPages] = useState<PagePhoto[]>([])
  const [pdf, setPdf] = useState<Pdf | null>(null)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [settings, setSettings] = useState<NotesSettings>(loadSettings)
  const [camera, setCamera] = useState(false)
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'compose' })
  const [fileError, setFileError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const pdfInput = useRef<HTMLInputElement>(null)
  const sets = useNoteSets((s) => s.sets)
  const ready = apiReady()

  // Thumbnails are object URLs: release them when the page closes; cancel a request still running.
  const pagesRef = useRef(pages)
  useEffect(() => {
    pagesRef.current = pages
  }, [pages])
  useEffect(
    () => () => {
      abort.current?.abort()
      pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url))
    },
    [],
  )

  const change = (s: Partial<NotesSettings>) => {
    const next = { ...settings, ...s }
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* private mode: settings last for this visit */
    }
  }

  const addPage = (p: PagePhoto) => setPages((ps) => (ps.length < LIMITS.pages ? [...ps, p] : (URL.revokeObjectURL(p.url), ps)))
  const removePage = (k: number) =>
    setPages((ps) => {
      URL.revokeObjectURL(ps[k].url)
      return ps.filter((_, j) => j !== k)
    })

  const addPhotos = async (files: FileList | null) => {
    setFileError('')
    const list = [...(files ?? [])]
    const room = LIMITS.pages - pagesRef.current.length
    if (list.length > room) setFileError(`Up to ${LIMITS.pages} pages at a time: the first ${room} ${room === 1 ? 'was' : 'were'} added.`)
    for (const f of list.slice(0, Math.max(0, room))) {
      try {
        addPage(await photoFromFile(f))
      } catch {
        setFileError(`“${f.name}” could not be opened as a photo.`)
      }
    }
  }

  const addPdf = async (file: File | undefined) => {
    setFileError('')
    if (!file) return
    if (file.type !== 'application/pdf') return setFileError('Choose a PDF file.')
    if (file.size > LIMITS.pdfBytes) return setFileError('That PDF is larger than 20 MB. Export only the pages you need.')
    setPdf({ name: file.name, size: file.size, data: await toBase64(file) })
  }

  const hasNotes = pages.length > 0 || !!pdf || text.trim().length > 0
  const tooLong = text.length > LIMITS.textChars

  const send = async () => {
    if (!hasNotes || tooLong || !ready) return
    if (localStorage.getItem(CONSENT_KEY) !== '1') return setConsent(true)
    haptic('light')
    const ctrl = new AbortController()
    abort.current = ctrl
    setPhase({ kind: 'working', stage: 'sending', started: Date.now() })
    try {
      const r = await requestSet(
        { images: pages.map((p) => ({ mediaType: 'image/jpeg', data: p.data })), pdf: pdf?.data, text: text.trim() || undefined },
        settings,
        (stage) => setPhase((ph) => (ph.kind === 'working' ? { ...ph, stage } : ph)),
        ctrl.signal,
      )
      if (r.status !== 'ok') return setPhase({ kind: 'not-used', result: r })
      const id = crypto.randomUUID().slice(0, 8)
      await useNoteSets.getState().save({
        id,
        title: r.title,
        createdAt: new Date().toISOString(),
        settings,
        from: { pages: pages.length, pdf: !!pdf, typed: !!text.trim() },
        transcript: r.transcript,
        corrections: r.corrections,
        questions: toQuestions(id, r.questions),
        review: r.review,
      })
      haptic('success')
      // The photos have done their job; they are not kept.
      pages.forEach((p) => URL.revokeObjectURL(p.url))
      setPages([])
      setPdf(null)
      setText('')
      setTyping(false)
      setPhase({ kind: 'compose' })
      useNav.getState().push({ kind: 'noteset', id })
    } catch (e) {
      if (ctrl.signal.aborted) return setPhase({ kind: 'compose' })
      setPhase({ kind: 'error', message: e instanceof NotesError ? e.message : 'Something went wrong. Please try again.' })
    } finally {
      abort.current = null
    }
  }

  const cancel = () => {
    abort.current?.abort()
    setPhase({ kind: 'compose' })
  }

  if (phase.kind === 'working') return <Working stage={phase.stage} started={phase.started} onCancel={cancel} />

  return (
    <div className="tab-page lessons notes">
      <PageHead title="Notes to Exam" />
      <div className="page-body">
        <p className="notes-intro">Photograph your anatomy notes. Atlas reads them and sets exam-style questions on exactly what you wrote, then a second examiner checks every answer.</p>

        {!ready && (
          <div className="notes-banner" role="note">
            <strong>Not connected in this preview.</strong> Notes to Exam needs the Atlas question service, which is not set up on this copy of the app. You can try the camera; sending is switched off.
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

        <section className="notes-capture" aria-label="Your notes">
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
            <button className="capture-btn" onClick={() => photoInput.current?.click()}>
              <UploadIcon />
              <span>Upload photos</span>
            </button>
            <button className="capture-btn" onClick={() => pdfInput.current?.click()}>
              <NotesIcon />
              <span>Upload a PDF</span>
            </button>
          </div>
          <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => (void addPhotos(e.target.files), (e.target.value = ''))} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => (void addPhotos(e.target.files), (e.target.value = ''))} />
          <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={(e) => (void addPdf(e.target.files?.[0]), (e.target.value = ''))} />

          {fileError && (
            <p className="field-error" role="alert">
              {fileError}
            </p>
          )}

          {pages.length > 0 && (
            <ol className="page-thumbs" aria-label="Pages">
              {pages.map((p, k) => (
                <li key={p.url}>
                  <img src={p.url} alt={`Page ${k + 1}`} />
                  <span className="page-num">{k + 1}</span>
                  <button className="page-remove" aria-label={`Remove page ${k + 1}`} onClick={() => removePage(k)}>
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ol>
          )}
          {pdf && (
            <div className="pdf-chip">
              <NotesIcon />
              <span className="pdf-name">{pdf.name}</span>
              <span className="muted small">{(pdf.size / 1024 / 1024).toFixed(1)} MB</span>
              <button className="icon-btn" aria-label="Remove the PDF" onClick={() => setPdf(null)}>
                <CloseIcon />
              </button>
            </div>
          )}

          {typing ? (
            <label className="field notes-text">
              <span>Typed notes</span>
              <textarea rows={7} value={text} placeholder="Type or paste your notes here." onChange={(e) => setText(e.target.value)} />
              {tooLong && <span className="field-error">That is more than one set can use ({LIMITS.textChars.toLocaleString('en-GB')} characters). Split it into two sets.</span>}
            </label>
          ) : (
            <button className="link-btn type-instead" onClick={() => setTyping(true)}>
              Type or paste notes instead
            </button>
          )}

          {!hasNotes && (
            <ul className="notes-tips">
              <li>One page per photo, flat, with the whole page in the frame.</li>
              <li>Good, even light; no shadow across the writing.</li>
              <li>Up to {LIMITS.pages} pages a set. Diagrams and labels are read too.</li>
            </ul>
          )}
        </section>

        <section className="notes-options" aria-label="Question settings">
          <h3>Questions</h3>
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
          <h3>Level</h3>
          <Chips label="Level" value={settings.level} options={Object.entries(LEVEL_LABEL) as [Level, string][]} onChange={(level) => change({ level })} />
          <h3>Question types</h3>
          <Chips
            label="Question types"
            value={settings.mix}
            options={[
              ['mixed', 'Mixed'],
              ['sba', 'Single best answer only'],
            ]}
            onChange={(mix) => change({ mix })}
          />
          <p className="muted small options-hint">{settings.mix === 'mixed' ? 'Mostly single best answer, with about one short-answer question in four.' : 'Every question has four options and one best answer.'}</p>
        </section>

        <button className="btn primary wide notes-send" disabled={!hasNotes || tooLong || !ready} onClick={send}>
          Write my exam questions
        </button>
        <p className="muted small notes-privacy">
          Your notes are sent to the Atlas question service, which uses Claude (by Anthropic) to read them. Photos are used for this set only and are not stored; the questions and the text read from your notes are saved on this device.
        </p>

        <SavedSets sets={sortedSets(sets)} />
      </div>

      {camera && (
        <CameraSheet
          pages={pages}
          max={LIMITS.pages}
          onAdd={addPage}
          onClose={() => setCamera(false)}
          onFallback={() => {
            setCamera(false)
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
    </div>
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
            <li>Your photos, PDF or typed notes are sent over an encrypted connection to the Atlas question service, which uses Claude, an AI model made by Anthropic, to read them and write the questions.</li>
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
