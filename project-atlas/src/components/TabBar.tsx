import type { ReactNode } from 'react'
import { useNav, type Tab } from '../state/nav'
import { AssessIcon, CoursesIcon, ExploreIcon, HomeIcon, PracticeIcon, ProfileIcon, ProgressIcon } from './Icons'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'courses', label: 'Courses', icon: <CoursesIcon /> },
  { id: 'explore', label: '3D', icon: <ExploreIcon /> },
  { id: 'practice', label: 'Practice', icon: <PracticeIcon /> },
  { id: 'assess', label: 'Tests', icon: <AssessIcon /> },
  { id: 'progress', label: 'Progress', icon: <ProgressIcon /> },
  { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
]

export function TabBar() {
  const { tab, setTab } = useNav()
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
