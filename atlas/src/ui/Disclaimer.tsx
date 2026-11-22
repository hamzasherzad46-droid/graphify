import { usePrefs } from '../state/store'

export function Disclaimer({ onClose }: { onClose?: () => void }) {
  const accept = usePrefs((s) => s.acceptDisclaimer)
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
        <p className="muted small">3D models are based on BodyParts3D (© DBCLS) and the Visible Human Female (HuBMAP), both CC BY 4.0. Full credits are in the menu.</p>
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
