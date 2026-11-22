import { CloseIcon } from './Icons'

export function Credits({ onBack }: { onBack: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onBack}>
      <aside className="sheet credits" role="dialog" aria-modal aria-label="Credits" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>Credits and attribution</h2>
          <button className="icon-btn" aria-label="Close" onClick={onBack}>
            <CloseIcon />
          </button>
        </header>

        <section>
          <h3>BodyParts3D</h3>
          <p>
            3D bone meshes: BodyParts3D 4.0, © The Database Center for Life Science (DBCLS), licensed under{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Mitsuhashi N. et al. (2009) BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research 37:D782–5.
          </p>
          <p className="muted small">
            Prepared for the web by Human Atlas (CC BY 4.0) and packaged as @dagno/anatomy-model. Modified for Atlas: bones selected and
            renamed, the three parts of the sternum merged, each bone re-centred, and the model Draco-compressed.
          </p>
        </section>

        <section>
          <h3>Z-Anatomy</h3>
          <p>
            Z-Anatomy, the open-source 3D anatomy atlas (
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
              CC BY-SA 4.0
            </a>
            ), is built on the same BodyParts3D data. Atlas follows its per-bone segmentation; this build does not yet contain Z-Anatomy
            files.
          </p>
        </section>

        <section>
          <h3>Approximate shapes</h3>
          <p className="muted small">
            BodyParts3D has no coccyx or auditory ossicle meshes. Atlas adds simplified shapes for the coccyx, malleus, incus and stapes;
            they are marked on each bone.
          </p>
        </section>

        <section>
          <h3>Software</h3>
          <p className="muted small">
            three.js (MIT), React and React Three Fiber (MIT), Zustand (MIT), Draco decoder (Apache 2.0), glTF-Transform (MIT), Inter
            typeface (SIL Open Font License).
          </p>
        </section>
      </aside>
    </div>
  )
}
