import { useState } from 'react'
import { TRACKS, type Track } from '../content/types'
import { SystemGlyph } from '../components/Icons'
import { LANG_NAMES, useT } from '../i18n'
import { DAILY_GOALS, LANGS, useSettings } from '../state/settings'

/** First run: name, study track, language and daily goal. */
export function OnboardingScreen() {
  const t = useT()
  const s = useSettings()
  const [name, setName] = useState(s.name)
  const [track, setTrack] = useState<Track>(s.track)
  const [goal, setGoal] = useState(s.dailyGoal)

  return (
    <div className="overlay onboarding">
      <main className="page">
        <div className="onb-plate" aria-hidden>
          {['bone', 'heart', 'brain', 'lungs', 'muscle', 'kidney'].map((g) => (
            <SystemGlyph key={g} glyph={g} size={30} />
          ))}
        </div>
        <p className="kicker">{t('onb.kicker')}</p>
        <h1 className="display onb-title">{t('onb.title')}</h1>
        <p className="onb-sub">{t('onb.sub')}</p>

        <div className="form">
          <div className="field">
            <span className="kicker">{t('onb.lang')}</span>
            <div className="chips">
              {LANGS.map((l) => (
                <button key={l} className="chip" lang={l} aria-pressed={s.lang === l} onClick={() => s.set({ lang: l })}>
                  {LANG_NAMES[l]}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="kicker">{t('onb.name')}</span>
            <input className="input" value={name} maxLength={24} placeholder={t('you.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
          </label>

          <div className="field">
            <span className="kicker">{t('onb.track')}</span>
            <div className="index">
              {TRACKS.map((tr) => (
                <button key={tr} className="index-row choice" aria-pressed={track === tr} onClick={() => setTrack(tr)}>
                  <span className="choice-dot" aria-hidden />
                  <span className="index-main">
                    <span className="index-title">{t(`track.${tr}`)}</span>
                    <span className="index-sub">{t(`trackHelp.${tr}`)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="kicker">{t('onb.goal')}</span>
            <div className="seg">
              {DAILY_GOALS.map((g) => (
                <button key={g} aria-pressed={goal === g} onClick={() => setGoal(g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-accent btn-block" onClick={() => s.set({ name: name.trim(), track, dailyGoal: goal, onboarded: true })}>
            {t('onb.start')}
          </button>
        </div>
      </main>
    </div>
  )
}
