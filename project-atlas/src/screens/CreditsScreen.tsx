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
        <p className="muted small credits-note">
          The 3D models are adapted from these sources and are shared under the same licences. Until the models are added, the app
          shows simple placeholder shapes.
        </p>

        <p className="section-label">Fonts</p>
        <p className="muted small">Fraunces and Inter, both under the SIL Open Font License.</p>

        <p className="section-label">Privacy</p>
        <p className="muted small">No ads, no analytics, no accounts. Progress is stored only on this device.</p>
      </main>
    </div>
  )
}
