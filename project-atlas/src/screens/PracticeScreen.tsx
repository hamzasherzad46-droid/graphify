import { useState } from 'react'
import { useModule } from '../content/useModule'
import { CardsIcon, ChevronIcon, ClockIcon, RedoIcon } from '../components/Icons'
import { useT } from '../i18n'
import { availableModules, defaultModuleId, startAssessment, startCards, startPractice, startReview } from '../state/actions'
import { missedCount } from '../state/dashboard'
import { useProgress } from '../state/progress'
import { ANSWER_TIMERS, useSettings, type QuizMode } from '../state/settings'

export function PracticeScreen() {
  const t = useT()
  const settings = useSettings()
  const last = settings.lastSession
  const [moduleId, setModuleId] = useState(last?.moduleId ?? defaultModuleId)
  const [mode, setMode] = useState<QuizMode>(last?.mode ?? 'learn')
  const [region, setRegion] = useState<string | null>(last?.region ?? null)
  const [timer, setTimer] = useState<number>(settings.answerTimer)
  const { assets } = useModule(moduleId)
  const records = useProgress((s) => s.records)
  const missed = assets ? missedCount(assets.content, records) : 0

  return (
    <main className="page">
      <p className="kicker">{t('practice.sub')}</p>
      <h1 className="display">{t('practice.title')}</h1>

      <div className="form">
        {availableModules.length > 1 && (
          <label className="field">
            <span className="kicker">{t('practice.module')}</span>
            <div className="chips">
              {availableModules.map((m) => (
                <button
                  key={m.id}
                  className="chip"
                  aria-pressed={moduleId === m.id}
                  onClick={() => {
                    setModuleId(m.id)
                    setRegion(null)
                  }}
                >
                  {t.td(`module.${m.id}`, m.id)}
                </button>
              ))}
            </div>
          </label>
        )}

        <div className="field">
          <span className="kicker">{t('practice.mode')}</span>
          <div className="seg">
            {(['learn', 'hard'] as const).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>
          <p className="small muted">{t(mode === 'learn' ? 'mode.learnHelp' : 'mode.hardHelp')}</p>
        </div>

        <div className="field">
          <span className="kicker">{t('practice.timer')}</span>
          <div className="seg">
            {ANSWER_TIMERS.map((s) => (
              <button key={s} aria-pressed={timer === s} onClick={() => setTimer(s)}>
                {s ? t('timer.sec', { n: s }) : t('timer.off')}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="kicker">{t('practice.region')}</span>
          <div className="chips">
            <button className="chip" aria-pressed={region === null} onClick={() => setRegion(null)}>
              {t('practice.all')}
            </button>
            {assets?.content.regions.map((r) => (
              <button key={r.id} className="chip" aria-pressed={region === r.id} onClick={() => setRegion(r.id)}>
                {t.td(`region.${r.id}`, r.name)}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-accent btn-block" disabled={!assets} onClick={() => startPractice(moduleId, region, mode, timer)}>
          {t('practice.start')}
        </button>
        <p className="tiny muted answer-lang">{t('practice.answerLang')}</p>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="h2">{t('practice.other')}</h2>
        </div>
        <div className="index">
          <button className="index-row" onClick={() => startCards(moduleId, region)}>
            <CardsIcon />
            <span className="index-main">
              <span className="index-title">{t('mod.cards')}</span>
              <span className="index-sub">{t('mod.cardsSub')}</span>
            </span>
            <ChevronIcon />
          </button>
          <button className="index-row" onClick={() => startAssessment(moduleId)}>
            <ClockIcon />
            <span className="index-main">
              <span className="index-title">{t('mod.exam')}</span>
              <span className="index-sub">{t('today.examSub')}</span>
            </span>
            <ChevronIcon />
          </button>
          <button className="index-row" disabled={!missed} onClick={() => void startReview(moduleId)}>
            <RedoIcon />
            <span className="index-main">
              <span className="index-title">
                {t('practice.review')} {missed > 0 && <span className="tag">{missed}</span>}
              </span>
              <span className="index-sub">{t('practice.reviewSub')}</span>
            </span>
            <ChevronIcon />
          </button>
        </div>
      </div>
    </main>
  )
}
