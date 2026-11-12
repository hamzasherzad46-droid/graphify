import { useState } from 'react'
import { Heatmap, Meter } from '../components/bits'
import { useModule } from '../content/useModule'
import { useT } from '../i18n'
import { formatClock, pct } from '../lib/format'
import { isMastered } from '../lib/srs'
import { availableModules, defaultModuleId } from '../state/actions'
import { useLevel } from '../state/dashboard'
import { useProgress } from '../state/progress'
import { mostMissed, regionStats } from '../state/stats'

export function ProgressScreen() {
  const t = useT()
  const [moduleId, setModuleId] = useState(defaultModuleId)
  const { assets } = useModule(moduleId)
  const { records, days, assessments } = useProgress()
  const level = useLevel()

  const content = assets?.content
  const regions = content ? regionStats(content, records) : []
  const seen = regions.reduce((n, r) => n + r.seen, 0)
  const mastered = regions.reduce((n, r) => n + r.mastered, 0)
  const attempts = regions.reduce((n, r) => n + r.attempts, 0)
  const correct = regions.reduce((n, r) => n + r.correct, 0)
  const missed = content ? mostMissed(content, records) : []

  return (
    <main className="page">
      <p className="kicker">
        {t('level.label', { n: level.level })} · {t(`level.${level.title}`)}
      </p>
      <h1 className="display">{t('progress.title')}</h1>

      <div className="figures">
        <div className="figure">
          <span className="figure-num serif">{level.xp}</span>
          <span className="kicker">{t('progress.totalXp')}</span>
        </div>
        <div className="figure">
          <span className="figure-num serif">{mastered}</span>
          <span className="kicker">{t('progress.mastered')}</span>
        </div>
        <div className="figure">
          <span className="figure-num serif">{attempts ? `${pct(correct, attempts)}%` : '—'}</span>
          <span className="kicker">{t('progress.accuracy')}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('progress.activity')}</h2>
          <span className="heat-legend tiny muted mono">
            {t('progress.less')} <span className="heat-cell l1" /> <span className="heat-cell l2" /> <span className="heat-cell l3" />{' '}
            <span className="heat-cell l4" /> {t('progress.more')}
          </span>
        </div>
        <Heatmap days={days} />
      </section>

      {availableModules.length > 1 && (
        <div className="chips progress-modules">
          {availableModules.map((m) => (
            <button key={m.id} className="chip" aria-pressed={moduleId === m.id} onClick={() => setModuleId(m.id)}>
              {t.td(`module.${m.id}`, m.id)}
            </button>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('progress.byRegion')}</h2>
          <span className="kicker">
            {t('progress.seen')} {seen}/{content?.structures.length ?? 0}
          </span>
        </div>
        <div className="index">
          {regions.map((r) => (
            <div key={r.id} className="index-row static">
              <span className="index-main">
                <span className="row">
                  <span className="index-title">{t.td(`region.${r.id}`, r.name)}</span>
                  <span className="mono small muted">{r.accuracy === null ? t('progress.notStarted') : `${r.accuracy}%`}</span>
                </span>
                <Meter value={r.accuracy ?? 0} max={100} tone="accent" />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('progress.mostMissed')}</h2>
        </div>
        {missed.length === 0 ? (
          <p className="empty">{t('progress.noMisses')}</p>
        ) : (
          <div className="index">
            {missed.map(({ structure, record, misses }) => (
              <div key={structure.id} className="index-row static">
                <span className="index-main index-title">{structure.name}</span>
                <span className="mono small muted">
                  {t('progress.missed', { n: misses })} · {pct(record.correct, record.attempts)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('progress.exams')}</h2>
        </div>
        {assessments.length === 0 ? (
          <p className="empty">{t('progress.noExams')}</p>
        ) : (
          <div className="index">
            {assessments.slice(0, 8).map((a) => (
              <div key={a.at} className="index-row static">
                <span className="index-main">
                  <span className="index-title">
                    {a.correct}/{a.total} <span className="mono small muted">{pct(a.correct, a.total)}%</span>
                  </span>
                </span>
                <span className="mono small muted">
                  {new Intl.DateTimeFormat(t.lang, { day: 'numeric', month: 'short' }).format(a.at)} · {formatClock(a.durationMs)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('progress.every')}</h2>
        </div>
        <div className="structure-table">
          {content?.structures.map((s) => {
            const r = records[s.id]
            return (
              <div key={s.id} className="row structure-row">
                <span className={isMastered(r) ? 'mastered' : ''}>{s.name}</span>
                <span className="mono tiny muted">{r ? `${pct(r.correct, r.attempts)}% · ${r.attempts}×` : '—'}</span>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
