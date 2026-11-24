import { useEffect, useRef, useState } from 'react'
import { Portal } from '../Portal'
import { CloseIcon, TorchIcon } from '../Icons'
import { haptic } from '../../lib/feedback'
import { photoFromVideo, type PagePhoto } from '../../lib/image'

type State = { kind: 'starting' } | { kind: 'live' } | { kind: 'blocked'; message: string }

/**
 * The in-app camera: a full-screen viewfinder with a page guide. Each press of the shutter adds a page; "Done"
 * returns to the list. Where the camera cannot be used (permission refused, no camera, an insecure page), it says
 * why and offers the phone's own camera instead (`onFallback`).
 */
export function CameraSheet({ pages, max, onAdd, onClose, onFallback }: { pages: PagePhoto[]; max: number; onAdd: (p: PagePhoto) => void; onClose: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<State>({ kind: 'starting' })
  const [torch, setTorch] = useState<boolean | null>(null) // null: not supported
  const [flash, setFlash] = useState(0)
  const [busy, setBusy] = useState(false)
  const full = pages.length >= max

  useEffect(() => {
    let stopped = false
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ kind: 'blocked', message: 'This browser cannot open the camera inside Atlas.' })
        return
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        })
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        const v = video.current!
        v.srcObject = s
        await v.play().catch(() => {})
        const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as { torch?: boolean }
        if (caps.torch) setTorch(false)
        setState({ kind: 'live' })
      } catch (e) {
        const name = (e as DOMException).name
        setState({
          kind: 'blocked',
          message:
            name === 'NotAllowedError' || name === 'SecurityError'
              ? 'Camera access is turned off for Atlas. You can allow it in your browser or phone settings.'
              : name === 'NotFoundError' || name === 'OverconstrainedError'
                ? 'No camera was found on this device.'
                : 'The camera could not be started.',
        })
      }
    }
    void start()
    return () => {
      stopped = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [])

  const shoot = async () => {
    const v = video.current
    if (!v || busy || full || !v.videoWidth) return
    setBusy(true)
    haptic('medium')
    setFlash((n) => n + 1)
    try {
      onAdd(await photoFromVideo(v))
    } finally {
      setBusy(false)
    }
  }

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0]
    if (!track || torch === null) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
      setTorch(!torch)
    } catch {
      setTorch(null)
    }
  }

  const last = pages.at(-1)
  return (
    <Portal>
      <div className="camera" role="dialog" aria-modal aria-label="Photograph your notes">
        <video ref={video} className="camera-video" playsInline muted autoPlay />
        {state.kind === 'live' && (
          <div className="camera-guide" aria-hidden>
            <span />
          </div>
        )}
        {flash > 0 && <div key={flash} className="camera-flash" aria-hidden />}

        <header className="camera-top">
          <button className="camera-round" aria-label="Close the camera" onClick={onClose}>
            <CloseIcon />
          </button>
          <span className="camera-hint" role="status">
            {state.kind === 'starting' ? 'Starting the camera…' : state.kind === 'live' ? (full ? `That’s the most for one set (${max} pages).` : 'One page at a time, flat and in good light.') : ''}
          </span>
          {torch !== null ? (
            <button className={`camera-round ${torch ? 'on' : ''}`} aria-label={torch ? 'Turn the light off' : 'Turn the light on'} aria-pressed={torch} onClick={toggleTorch}>
              <TorchIcon />
            </button>
          ) : (
            <span className="camera-round-spacer" />
          )}
        </header>

        {state.kind === 'blocked' && (
          <div className="camera-blocked">
            <p>{state.message}</p>
            <button className="btn primary" onClick={onFallback}>
              Use the phone’s camera instead
            </button>
            <button className="btn ghost" onClick={onClose}>
              Back
            </button>
          </div>
        )}

        <footer className="camera-bottom">
          <div className="camera-last">
            {last && (
              <>
                <img src={last.url} alt="" />
                <span className="camera-count" aria-label={`${pages.length} ${pages.length === 1 ? 'page' : 'pages'} taken`}>
                  {pages.length}
                </span>
              </>
            )}
          </div>
          <button className="camera-shutter" aria-label={`Take a photo of page ${pages.length + 1}`} disabled={state.kind !== 'live' || full || busy} onClick={shoot}>
            <span />
          </button>
          <button className="camera-done" disabled={!pages.length} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </Portal>
  )
}
