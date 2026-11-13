import { useState } from 'react'
import { TRACKS } from '../content/types'
import { ChevronIcon } from '../components/Icons'
import { LANG_NAMES, useT } from '../i18n'
import { useNav } from '../state/nav'
import { useProgress } from '../state/progress'
import { ANSWER_TIMERS, DAILY_GOALS, LANGS, useSettings } from '../state/settings'

export function YouScreen() {
  const t = useT()
  const s = useSettings()
  const reset = useProgress((p) => p.reset)
  const setCredits = useNav((n) => n.setCredits)
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="page">
      <h1 className="display">{t('you.title')}</h1>

      <div className="form">
        <label className="field">
          <span className="kicker">{t('you.name')}</span>
          <input
            className="input"
            value={s.name}
            maxLength={24}
            placeholder={t('you.namePlaceholder')}
            onChange={(e) => s.set({ name: e.target.value })}
          />
        </label>

        <div className="field">
          <span className="kicker">{t('you.track')}</span>
          <div className="index">
            {TRACKS.map((tr) => (
              <button key={tr} className="index-row choice" aria-pressed={s.track === tr} onClick={() => s.set({ track: tr })}>
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
          <span className="kicker">{t('you.language')}</span>
          <div className="chips">
            {LANGS.map((l) => (
              <button key={l} className="chip" lang={l} aria-pressed={s.lang === l} onClick={() => s.set({ lang: l })}>
                {LANG_NAMES[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="kicker">{t('you.theme')}</span>
          <div className="seg">
            {(['light', 'dark', 'system'] as const).map((th) => (
              <button key={th} aria-pressed={s.theme === th} onClick={() => s.set({ theme: th })}>
                {t(`theme.${th}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="kicker">{t('you.goal')}</span>
          <div className="seg">
            {DAILY_GOALS.map((g) => (
              <button key={g} aria-pressed={s.dailyGoal === g} onClick={() => s.set({ dailyGoal: g })}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="kicker">{t('you.timer')}</span>
          <div className="seg">
            {ANSWER_TIMERS.map((sec) => (
              <button key={sec} aria-pressed={s.answerTimer === sec} onClick={() => s.set({ answerTimer: sec })}>
                {sec ? t('timer.sec', { n: sec }) : t('timer.off')}
              </button>
            ))}
          </div>
        </div>

        <button className="index-row" role="switch" aria-checked={s.sound} onClick={() => s.set({ sound: !s.sound })}>
          <span className="index-main index-title">{t('you.sound')}</span>
          <span className={`switch${s.sound ? ' on' : ''}`} />
        </button>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="h2">{t('you.data')}</h2>
        </div>
        <div className="index">
          {/* In-page confirm: native confirm() is blocked in sandboxed hosts. */}
          <button
            className="index-row danger"
            onClick={() => {
              if (!confirming) return setConfirming(true)
              reset()
              setConfirming(false)
            }}
            onBlur={() => setConfirming(false)}
          >
            <span className="index-main index-title">{confirming ? t('you.resetConfirm') : t('you.reset')}</span>
            {confirming && <span className="tiny muted">{t('you.cantUndo')}</span>}
          </button>
          <button className="index-row" onClick={() => setCredits(true)}>
            <span className="index-main index-title">{t('you.about')}</span>
            <ChevronIcon />
          </button>
        </div>
      </div>
    </main>
  )
}
