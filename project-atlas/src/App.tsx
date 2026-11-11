import { useEffect } from 'react'
import { TabBar } from './components/TabBar'
import { QuizScreen } from './quiz/QuizScreen'
import { AssessScreen } from './screens/AssessScreen'
import { CoursesScreen } from './screens/CoursesScreen'
import { CreditsScreen } from './screens/CreditsScreen'
import { ExploreScreen } from './screens/ExploreScreen'
import { HomeScreen } from './screens/HomeScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { useNav } from './state/nav'
import { applyTheme, useSettings } from './state/settings'
import './app.css'

const SCREENS = {
  home: HomeScreen,
  courses: CoursesScreen,
  explore: ExploreScreen,
  practice: PracticeScreen,
  assess: AssessScreen,
  progress: ProgressScreen,
  profile: ProfileScreen,
}

export default function App() {
  const theme = useSettings((s) => s.theme)
  const { tab, session, credits } = useNav()

  useEffect(() => applyTheme(theme), [theme])

  const Screen = SCREENS[tab]
  return (
    <>
      <div className="app" hidden={!!session}>
        <Screen key={tab} />
        <TabBar />
      </div>
      {credits && !session && <CreditsScreen />}
      {session && <QuizScreen config={session} />}
    </>
  )
}
