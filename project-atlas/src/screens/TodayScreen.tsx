import { useMemo, useState } from 'react'
import { catalog } from '../content/loader'
import type { BodySystem, Structure } from '../content/types'
import { useModule } from '../content/useModule'
import { CardsIcon, ChevronIcon, ClockIcon, FlameIcon, RedoIcon, SystemGlyph } from '../components/Icons'
import { Meter, Ring, WeekStrip } from '../components/bits'
import { useT } from '../i18n'
import type { Period } from '../lib/dates'
import { pct, weekdayLabels } from '../lib/format'
import { defaultModuleId, startAssessment, startCards, startPractice, startReview } from '../state/actions'
import { dueCards, missedCount, useAssignments, useLevel, useStreak } from '../state/dashboard'
import { useNav } from '../state/nav'
import { dayKey, useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { mostMissed, regionStats } from '../state/stats'

function hashIndex(key: string, n: number) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return n ? h % n : 0
}

export function TodayScreen() {
  const t = useT()
  const { name, lastSession, dailyGoal } = useSettings()
  const moduleId = lastSession?.moduleId ?? defaultModuleId
  const { assets } = useModule(moduleId)
  const { records, cards, days } = useProgress()
  const { streak, week } = useStreak()
  const level = useLevel()
  const now = new Date()
  const today = days[dayKey(now)]
  const answered = today?.answered ?? 0

  const hour = now.getHours()
  const greeting = t(hour < 12 ? 'today.morning' : hour < 18 ? 'today.afternoon' : 'today.evening')
  const dateLine = new Intl.DateTimeFormat(t.lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(now)

  const content = assets?.content
  const due = content ? dueCards(content, cards) : 0
  const mistakes = content ? missedCount(content, records) : 0
  const weak = content ? mostMissed(content, records, 6) : []
  const fact: Structure | undefined = content ? content.structures[hashIndex(dayKey(now), content.structures.length)] : undefined
  const regionName = (id: string | null) => (id ? t.td(`region.${id}`, content?.regions.find((r) => r.id === id)?.name ?? id) : t('practice.all'))

  return (
    <main className="page today">
      <header className="masthead">
        <p className="kicker">
          {dateLine}
          {streak > 0 && <span className="masthead-day"> · {t('today.streak')} {streak}</span>}
        </p>
        <h1 className="display">
          {greeting}
          {name ? (
            <>
              , <em>{name}</em>.
            </>
          ) : (
            '.'
          )}
        </h1>
        <div className="level-line">
          <span className="mono small">
            {t('level.label', { n: level.level })} · {t(`level.${level.title}`)}
          </span>
          <span className="tiny muted mono">{t('level.toNext', { n: level.span - level.into, next: level.level + 1 })}</span>
        </div>
        <Meter value={level.into} max={level.span} tone="accent" />
      </header>

      <section className="sheet hero">
        <div className="hero-goal">
          <Ring value={answered} max={dailyGoal}>
            <span className="ring-num serif">{answered}</span>
            <span className="ring-of mono">/{dailyGoal}</span>
          </Ring>
          <div>
            <p className="kicker">{t('today.goal')}</p>
            <p className="hero-goal-text">{answered >= dailyGoal ? t('today.goalDone') : t('today.answered')}</p>
          </div>
        </div>
        <div className="hero-streak">
          <div className="streak-num">
            <span className={streak > 0 ? 'flame on' : 'flame'}>
              <FlameIcon size={22} />
            </span>
            <span className="serif">{streak}</span>
            <span className="small muted">{streak > 0 ? t('today.streak') : t('today.streakStart')}</span>
          </div>
          <WeekStrip days={week} labels={weekdayLabels(t.lang)} />
        </div>
        <button className="btn btn-accent btn-block hero-cta" onClick={() => startPractice(moduleId, lastSession?.region ?? null, lastSession?.mode ?? 'learn')}>
          <span className="hero-cta-text">
            <span>{lastSession ? t('today.continue') : t('today.startHere')}</span>
            <span className="hero-cta-sub">
              {t.td(`module.${moduleId}`, moduleId)} · {regionName(lastSession?.region ?? null)}
            </span>
          </span>
          <ChevronIcon />
        </button>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('today.due')}</h2>
        </div>
        <div className="grid-2">
          <button className="tile" onClick={() => startCards(moduleId)}>
            <CardsIcon />
            <span className="tile-num serif">{due}</span>
            <span className="tile-label">{t('today.cardsDue')}</span>
          </button>
          <button className="tile" disabled={!mistakes} onClick={() => void startReview(moduleId)}>
            <RedoIcon />
            <span className="tile-num serif">{mistakes}</span>
            <span className="tile-label">{t('today.mistakes')}</span>
          </button>
        </div>
      </section>

      <Assignments />

      {fact && (
        <section className="section">
          <div className="section-head">
            <h2 className="h2">{t('today.fact')}</h2>
            <span className="kicker">{fact.latinName}</span>
          </div>
          <button className="fact" onClick={() => startCards(moduleId)}>
            <span className="fact-name serif">{fact.name}</span>
            <span className="fact-why">{fact.why}</span>
            <span className="fact-fn small muted">{fact.function}</span>
          </button>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('today.systems')}</h2>
          <span className="kicker">{catalog.systems.length}</span>
        </div>
        <div className="systems-grid">
          {catalog.systems.map((s, i) => (
            <SystemTile key={s.id} system={s} n={i + 1} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{t('today.weak')}</h2>
        </div>
        {weak.length === 0 ? (
          <p className="empty">{t('today.noWeak')}</p>
        ) : (
          <div className="chips">
            {weak.map((w) => (
              <button key={w.structure.id} className="chip weak-chip" onClick={() => void startReview(moduleId)}>
                {w.structure.name} <span className="mono tiny muted">{pct(w.record.correct, w.record.attempts)}%</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <button className="index-row exam-row" onClick={() => startAssessment(moduleId)}>
          <ClockIcon />
          <span className="index-main">
            <span className="index-title">{t('today.exam')}</span>
            <span className="index-sub">{t('today.examSub')}</span>
          </span>
          <ChevronIcon />
        </button>
      </section>
    </main>
  )
}

function Assignments() {
  const t = useT()
  const all = useAssignments()
  const [period, setPeriod] = useState<Period>('day')
  const list = all.filter((a) => a.period === period)
  const doneCount = list.filter((a) => a.done).length
  const left = list[0]?.remainingMs ?? 0
  const leftLabel = left > 48 * 3600_000 ? t('time.daysLeft', { n: Math.ceil(left / 86_400_000) }) : t('time.hoursLeft', { n: Math.max(1, Math.ceil(left / 3_600_000)) })

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="h2">{t('today.assignments')}</h2>
        <span className="kicker">
          {doneCount}/{list.length} · {leftLabel}
        </span>
      </div>
      <div className="seg assign-seg">
        {(['day', 'week', 'month'] as const).map((p) => (
          <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {t(`period.${p}`)}
          </button>
        ))}
      </div>
      <ol className="assignments">
        {list.map((a) => (
          <li key={a.key} className={`assignment${a.done ? ' done' : ''}`}>
            <span className="assignment-box" aria-hidden />
            <span className="assignment-main">
              <span className="assignment-text">{t(`assignment.${a.id}` as Parameters<typeof t>[0], { n: a.target })}</span>
              <Meter value={a.value} max={a.target} tone={a.done ? 'moss' : undefined} />
            </span>
            <span className="assignment-side">
              <span className="mono tiny muted">
                {a.value}/{a.target}
              </span>
              <span className={`tag ${a.done ? 'done' : 'xp'}`}>+{a.xp} XP</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function SystemTile({ system, n }: { system: BodySystem; n: number }) {
  const t = useT()
  const openModule = useNav((s) => s.openModule)
  const available = system.modules.find((m) => m.status === 'available')
  const { assets } = useModule(available?.id ?? null)
  const records = useProgress((s) => s.records)
  const mastery = useMemo(() => {
    if (!assets) return null
    const stats = regionStats(assets.content, records)
    const total = stats.reduce((a, r) => a + r.total, 0)
    return pct(
      stats.reduce((a, r) => a + r.mastered, 0),
      total,
    )
  }, [assets, records])

  return (
    <button className={`system-tile${available ? '' : ' soon'}`} disabled={!available} onClick={() => available && openModule(available.id)}>
      <span className="system-num mono">{String(n).padStart(2, '0')}</span>
      <SystemGlyph glyph={system.glyph} />
      <span className="system-name">{t.td(`system.${system.id}`, system.id)}</span>
      <span className="system-meta mono">{available ? (mastery === null ? '…' : t('atlas.mastered', { n: mastery })) : t('common.soon')}</span>
    </button>
  )
}
