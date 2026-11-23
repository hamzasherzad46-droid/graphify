import { usePrefs } from '../state/store'

export function Disclaimer({ onClose }: { onClose?: () => void }) {
  const accept = usePrefs((s) => s.acceptDisclaimer)
  const name = usePrefs((s) => s.name)
  const firstLaunch = !usePrefs((s) => s.disclaimerAccepted)
  return (
    <div className="modal-backdrop">
      <div className="modal disclaimer" role="dialog" aria-modal aria-labelledby="disc-title">
        <p className="eyebrow">Atlas · Skeletal system</p>
        <h2 id="disc-title">For education only</h2>
        <p>
          Atlas is a study aid for anatomy students. It is <strong>not medical advice</strong> and must not be used for diagnosis or
          treatment.
        </p>
        <p>
          This is a <strong>beta</strong>. Bone content is under academic review: each bone shows whether it is a draft or has been
          reviewed. If you spot a mistake, use “Report an error” on that bone.
        </p>
        <p className="muted small">3D models are adapted from Z-Anatomy (CC BY-SA 4.0), BodyParts3D and the Visible Human Female (HuBMAP). Full credits are in You → Credits.</p>
        {firstLaunch && (
          <label className="field">
            <span>What should we call you? (optional)</span>
            <input value={name} maxLength={40} autoComplete="given-name" placeholder="First name" onChange={(e) => usePrefs.getState().setProfile({ name: e.target.value })} />
          </label>
        )}
        <div className="modal-actions">
          <button
            className="btn primary wide"
            onClick={() => {
              accept()
              onClose?.()
            }}
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  )
}
