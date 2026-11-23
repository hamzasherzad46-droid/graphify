import { CloseIcon } from './Icons'
import { Portal } from './Portal'

const BY = 'https://creativecommons.org/licenses/by/4.0/'
const BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/'

export function Credits({ onBack }: { onBack: () => void }) {
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onBack}>
        <aside className="sheet credits" role="dialog" aria-modal aria-label="Credits and attribution" onClick={(e) => e.stopPropagation()}>
          <header className="sheet-head">
            <h2>Credits and attribution</h2>
            <button className="icon-btn" aria-label="Close" onClick={onBack}>
              <CloseIcon />
            </button>
          </header>

          <section className="licence-note">
            <p>
              Atlas’s 3D models are adapted from the works below and are shared under{' '}
              <a href={BY_SA} target="_blank" rel="noreferrer">
                CC BY-SA 4.0
              </a>
              . You may reuse and adapt them if you credit these sources and share your version under the same licence.
            </p>
          </section>

          <section>
            <h3>Z-Anatomy</h3>
            <p>
              3D anatomy models from the Z-Anatomy project, licensed under{' '}
              <a href={BY_SA} target="_blank" rel="noreferrer">
                CC BY-SA 4.0
              </a>
              . Z-Anatomy PC application and model release by Lluís Vinent Juanico; contributor Gauthier Kervyn.{' '}
              <a href="https://github.com/LluisV/Z-Anatomy" target="_blank" rel="noreferrer">
                github.com/LluisV/Z-Anatomy
              </a>
            </p>
            <p className="muted small">
              Used: the male skeleton (all 206 bones, teeth, costal cartilages) and intervertebral discs. Modified for Atlas: bones
              renamed to Atlas ids, the three parts of the sternum merged, meshes simplified and re-centred, units converted to metres,
              Draco-compressed.
            </p>
          </section>

          <section>
            <h3>BodyParts3D</h3>
            <p>
              Z-Anatomy is built on BodyParts3D, © The Database Center for Life Science (DBCLS), licensed under{' '}
              <a href={BY} target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>
              . Mitsuhashi N. et al. (2009) BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research 37:D782–5.
            </p>
          </section>

          <section>
            <h3>Visible Human Female (HuBMAP)</h3>
            <p>
              Female skeleton, real bones (vertebrae C1–L5, sacrum, coccyx, hip bones, femur, patella, tibia, fibula): Human Reference
              Atlas, 3D Reference Organ Set for Female v1.5, K. Browne and H. Schlehlein, HuBMAP, licensed under{' '}
              <a href={BY} target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>{' '}
              (
              <a href="https://doi.org/10.48539/HBM352.BTSQ.586" target="_blank" rel="noreferrer">
                doi:10.48539/HBM352.BTSQ.586
              </a>
              ), built from the Visible Human Project® female dataset, courtesy of the U.S. National Library of Medicine.
            </p>
            <p className="muted small">
              Modified for Atlas: meshes simplified; the hip bone’s ilium, ischium and pubis merged; the donor has six lumbar vertebrae
              (a normal variant), so the uppermost was left out and the spine above it lowered, to show the standard five. The female
              skull, thorax, upper limbs and feet are adapted from the Z-Anatomy male: scaled by the female/male long-bone ratio, fitted
              to these bones, with typical female skull adjustments.
            </p>
          </section>

          <section>
            <h3>Software</h3>
            <p className="muted small">
              three.js (MIT), React and React Three Fiber (MIT), Zustand (MIT), Draco decoder (Apache 2.0), glTF-Transform (MIT),
              meshoptimizer (MIT), Inter typeface (SIL Open Font License).
            </p>
          </section>
        </aside>
      </div>
    </Portal>
  )
}
