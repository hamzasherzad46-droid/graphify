import { useEffect, useRef } from 'react'
import { TabBar } from './components/TabBar'
import { Toasts } from './components/bits'
import { applyLang, useT } from './i18n'
import { playSound } from './lib/sound'
import { QuizScreen } from './quiz/QuizScreen'
import { AtlasScreen } from './screens/AtlasScreen'
import { CreditsScreen } from './screens/CreditsScreen'
import { ExploreScreen } from './screens/ExploreScreen'
import { FlashcardScreen } from './screens/FlashcardScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { TodayScreen } from './screens/TodayScreen'
import { YouScreen } from './screens/YouScreen'
import { useAssignments, useLevel } from './state/dashboard'
import { useNav } from './state/nav'
import { useProgress } from './state/progress'
import { applyTheme, useSettings } from './state/settings'
import { useToasts } from './state/toast'
import './app.css'

const SCREENS = {
  today: TodayScreen,
  atlas: AtlasScreen,
  practice: PracticeScreen,
  progress: ProgressScreen,
  you: YouScreen,
}

/** Awards finished assignments once and celebrates level-ups. */
function EngagementWatcher() {
  const t = useT()
  const assignments = useAssignments()
  const claimed = useProgress((s) => s.claimed)
  const level = useLevel()
  const push = useToasts((s) => s.push)
  const lastLevel = useRef(level.level)

  useEffect(() => {
    for (const a of assignments) {
      if (a.done && !claimed[a.key]) {
        useProgress.getState().claim(a.key, a.xp)
        push({ kind: 'assignment', title: t('toast.assignment'), detail: `${t(`assignment.${a.id}` as Parameters<typeof t>[0], { n: a.target })} · +${a.xp} XP` })
      }
    }
  }, [assignments, claimed, push, t])

  useEffect(() => {
    if (level.level > lastLevel.current) {
      push({ kind: 'level', title: t('toast.levelUp', { n: level.level }), detail: t(`level.${level.title}`) })
      playSound('level')
    }
    lastLevel.current = level.level
  }, [level.level, level.title, push, t])

  return null
}

export default function App() {
  const theme = useSettings((s) => s.theme)
  const lang = useSettings((s) => s.lang)
  const onboarded = useSettings((s) => s.onboarded)
  const { tab, session, cards, explore, credits } = useNav()

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => applyLang(lang), [lang])

  const Screen = SCREENS[tab]
  const overlay = session || cards || explore
  return (
    <>
      <div className="app" hidden={!!overlay}>
        <Screen key={tab} />
        <TabBar />
      </div>
      {credits && !overlay && <CreditsScreen />}
      {explore && !session && !cards && <ExploreScreen moduleId={explore} />}
      {session && <QuizScreen config={session} />}
      {cards && <FlashcardScreen config={cards} />}
      {!onboarded && <OnboardingScreen />}
      <EngagementWatcher />
      <Toasts />
    </>
  )
}
