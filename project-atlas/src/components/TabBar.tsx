import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { useNav, type Tab } from '../state/nav'
import { AtlasIcon, PracticeIcon, ProgressIcon, TodayIcon, YouIcon } from './Icons'

const TABS: { id: Tab; icon: ReactNode }[] = [
  { id: 'today', icon: <TodayIcon /> },
  { id: 'atlas', icon: <AtlasIcon /> },
  { id: 'practice', icon: <PracticeIcon /> },
  { id: 'progress', icon: <ProgressIcon /> },
  { id: 'you', icon: <YouIcon /> },
]

export function TabBar() {
  const t = useT()
  const { tab, setTab } = useNav()
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((x) => (
        <button key={x.id} className="tab" aria-current={tab === x.id ? 'page' : undefined} onClick={() => setTab(x.id)}>
          {x.icon}
          <span>{t(`tab.${x.id}`)}</span>
        </button>
      ))}
    </nav>
  )
}
