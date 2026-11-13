import { catalog, getModuleInfo } from '../content/loader'
import type { ModuleInfo } from '../content/types'
import { useModule } from '../content/useModule'
import { CardsIcon, ChevronIcon, ClockIcon, CubeIcon, PracticeIcon, SystemGlyph } from '../components/Icons'
import { Meter } from '../components/bits'
import { useT } from '../i18n'
import { pct } from '../lib/format'
import { startAssessment, startCards, startPractice } from '../state/actions'
import { ASSESSMENT_ANSWER_TIMER, ASSESSMENT_LENGTH, ASSESSMENT_TIME_MS, useNav } from '../state/nav'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { regionStats } from '../state/stats'

export function AtlasScreen() {
  const t = useT()
  const modulePage = useNav((s) => s.modulePage)
  if (modulePage) return <ModuleScreen id={modulePage} />

  return (
    <main className="page">
      <p className="kicker">{t('atlas.sub')}</p>
      <h1 className="display">{t('atlas.title')}</h1>
      <div className="atlas-list">
        {catalog.systems.map((sys, i) => (
          <section key={sys.id} className="atlas-system">
            <div className="atlas-system-head">
              <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
              <SystemGlyph glyph={sys.glyph} size={30} />
              <div className="index-main">
                <h2 className="h2">{t.td(`system.${sys.id}`, sys.id)}</h2>
                <p className="index-sub">{t.td(`systemBlurb.${sys.id}`, '')}</p>
              </div>
            </div>
            <div className="index">
              {sys.modules.map((m) => (
                <ModuleRow key={m.id} info={m} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function ModuleRow({ info }: { info: ModuleInfo }) {
  const t = useT()
  const openModule = useNav((s) => s.openModule)
  const available = info.status === 'available'
  const { assets } = useModule(available ? info.id : null)
  const records = useProgress((s) => s.records)
  const stats = assets ? regionStats(assets.content, records) : []
  const total = stats.reduce((n, r) => n + r.total, 0)
  const mastered = stats.reduce((n, r) => n + r.mastered, 0)

  return (
    <button className="index-row" disabled={!available} onClick={() => openModule(info.id)}>
      <span className="index-main">
        <span className="index-title">{t.td(`module.${info.id}`, info.id)}</span>
        <span className="index-sub">
          {available ? `${t('atlas.structures', { n: total })} · ${t('atlas.mastered', { n: pct(mastered, total) })}` : t('common.soon')}
        </span>
      </span>
      {available ? <ChevronIcon /> : <span className="tag">{t('common.soon')}</span>}
    </button>
  )
}

function ModuleScreen({ id }: { id: string }) {
  const t = useT()
  const { openModule, openExplore } = useNav()
  const lastMode = useSettings((s) => s.lastSession?.mode ?? 'learn')
  const info = getModuleInfo(id)
  const { assets } = useModule(id)
  const records = useProgress((s) => s.records)
  if (!info) return null
  const stats = assets ? regionStats(assets.content, records) : []
  const total = stats.reduce((n, r) => n + r.total, 0)
  const seen = stats.reduce((n, r) => n + r.seen, 0)
  const mastered = stats.reduce((n, r) => n + r.mastered, 0)

  return (
    <main className="page module-page">
      <button className="back mono" onClick={() => openModule(null)}>
        <span className="flip-rtl">←</span> {t('atlas.title')}
      </button>
      <p className="kicker">{t.td(`system.${info.systemId}`, '')}</p>
      <h1 className="display">{t.td(`module.${id}`, id)}</h1>
      <div className="module-stats mono small">
        <span>{t('atlas.structures', { n: total })}</span>
        <span>{t('mod.seen', { a: seen, b: total })}</span>
        <span>{t('atlas.mastered', { n: pct(mastered, total) })}</span>
      </div>
      <Meter value={mastered} max={total} tone="moss" />

      <div className="actions">
        <button className="action" onClick={() => startCards(id)}>
          <CardsIcon />
          <span className="action-title">{t('mod.cards')}</span>
          <span className="action-sub">{t('mod.cardsSub')}</span>
        </button>
        <button className="action primary" onClick={() => startPractice(id, null, lastMode)}>
          <PracticeIcon />
          <span className="action-title">{t('mod.practice')}</span>
          <span className="action-sub">{t('mod.practiceSub')}</span>
        </button>
        <button className="action" onClick={() => startAssessment(id)}>
          <ClockIcon />
          <span className="action-title">{t('mod.exam')}</span>
          <span className="action-sub">{t('mod.examSub', { n: ASSESSMENT_LENGTH, m: ASSESSMENT_TIME_MS / 60_000, s: ASSESSMENT_ANSWER_TIMER })}</span>
        </button>
        <button className="action" onClick={() => openExplore(id)}>
          <CubeIcon />
          <span className="action-title">{t('mod.explore')}</span>
          <span className="action-sub">{t('mod.exploreSub')}</span>
        </button>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="h2">{t('mod.regions')}</h2>
        </div>
        <div className="index">
          {stats.map((r, i) => (
            <button key={r.id} className="index-row" onClick={() => startPractice(id, r.id, lastMode)}>
              <span className="index-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="index-main">
                <span className="index-title">{t.td(`region.${r.id}`, r.name)}</span>
                <span className="index-sub">
                  {t('mod.seen', { a: r.seen, b: r.total })}
                  {r.accuracy !== null && ` · ${r.accuracy}%`}
                </span>
                <Meter value={r.mastered} max={r.total} tone="moss" />
              </span>
              <ChevronIcon />
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
