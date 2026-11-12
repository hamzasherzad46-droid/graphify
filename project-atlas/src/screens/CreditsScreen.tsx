import { useT } from '../i18n'
import { useNav } from '../state/nav'

/** Required attribution for the 3D model sources. Keep this intact (licence text stays in English). */
export function CreditsScreen() {
  const t = useT()
  const setCredits = useNav((s) => s.setCredits)
  return (
    <div className="overlay">
      <main className="page">
        <button className="back mono" onClick={() => setCredits(false)}>
          <span className="flip-rtl">←</span> {t('common.back')}
        </button>
        <h1 className="display">{t('credits.about')}</h1>
        <p className="onb-sub">{t('credits.desc')}</p>

        <div className="section">
          <div className="section-head">
            <h2 className="h2">{t('credits.models')}</h2>
          </div>
          <div className="index credits" dir="ltr">
            <div className="index-row static">
              <span className="index-main">
                <span className="credit">BodyParts3D – The Database Center for Life Science – CC BY-SA 2.1 Japan</span>
                <a className="index-sub" href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer">
                  creativecommons.org/licenses/by-sa/2.1/jp
                </a>
              </span>
            </div>
            <div className="index-row static">
              <span className="index-main">
                <span className="credit">Z-Anatomy – The libre 3D atlas of anatomy – CC BY-SA 4.0</span>
                <a className="index-sub" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
                  creativecommons.org/licenses/by-sa/4.0
                </a>
              </span>
            </div>
            <div className="index-row static">
              <span className="index-main">
                <span className="credit">
                  Skeleton model: BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0 (dataset licence updated 2025-02-27).
                  Prepared for the web by the @dagno/anatomy-model package.
                </span>
                <a className="index-sub" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                  creativecommons.org/licenses/by/4.0
                </a>
                <span className="index-sub">
                  Changes for Atlas: bones selected and renamed, the medial and lateral epicondyles separated from the humerus, an
                  approximate coccyx added (BodyParts3D has no coccyx mesh), and the model compressed.
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <h2 className="h2">{t('credits.fonts')}</h2>
          </div>
          <p className="small muted" dir="ltr">
            Newsreader, IBM Plex Sans and IBM Plex Mono — SIL Open Font License.
          </p>
        </div>

        <div className="section">
          <div className="section-head">
            <h2 className="h2">{t('credits.privacy')}</h2>
          </div>
          <p className="small muted">{t('credits.privacyText')}</p>
        </div>
      </main>
    </div>
  )
}
