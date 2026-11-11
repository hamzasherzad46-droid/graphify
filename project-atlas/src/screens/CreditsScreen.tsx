import { useNav } from '../state/nav'

/** Required attribution for the 3D model sources. Keep this intact. */
export function CreditsScreen() {
  const setCredits = useNav((s) => s.setCredits)
  return (
    <div className="overlay">
      <main className="screen">
        <button className="back" onClick={() => setCredits(false)}>
          ← Back
        </button>
        <h1 className="screen-title">About</h1>
        <p className="screen-sub">Atlas is a typing-based anatomy trainer for nursing and medical students. Prototype.</p>

        <p className="section-label">3D model credits</p>
        <div className="list">
          <div className="card">
            <p>BodyParts3D – The Database Center for Life Science – CC BY-SA 2.1 Japan</p>
            <a className="muted small" href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">
              creativecommons.org/licenses/by-sa/2.1/jp
            </a>
          </div>
          <div className="card">
            <p>Z-Anatomy – The libre 3D atlas of anatomy – CC BY-SA 4.0</p>
            <a className="muted small" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              creativecommons.org/licenses/by-sa/4.0
            </a>
          </div>
        </div>
        <div className="card credits-model">
          <p>
            Skeleton model: BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0 (dataset licence updated 2025-02-27).
            Prepared for the web by the @dagno/anatomy-model package.
          </p>
          <a className="muted small" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            creativecommons.org/licenses/by/4.0
          </a>
          <p className="muted small credits-note">
            Changes for Atlas: bones selected and renamed, the medial and lateral epicondyles separated from the humerus, an approximate
            coccyx added (BodyParts3D has no coccyx mesh), and the model compressed.
          </p>
        </div>

        <p className="section-label">Fonts</p>
        <p className="muted small">Fraunces and Inter, both under the SIL Open Font License.</p>

        <p className="section-label">Privacy</p>
        <p className="muted small">No ads, no analytics, no accounts. Progress is stored only on this device.</p>
      </main>
    </div>
  )
}
