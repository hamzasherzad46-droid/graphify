import type { ReactNode } from 'react'
import { useNav, type Tab } from '../state/nav'
import { haptic } from '../lib/feedback'
import { CubeIcon, HomeIcon, PracticeIcon, ProgressIcon, UserIcon } from './Icons'

const TABS: [Tab, string, ReactNode][] = [
  ['home', 'Home', <HomeIcon />],
  ['3d', '3D', <CubeIcon />],
  ['practice', 'Practice', <PracticeIcon />],
  ['progress', 'Progress', <ProgressIcon />],
  ['you', 'You', <UserIcon />],
]

export function TabBar() {
  const tab = useNav((s) => s.tab)
  const go = useNav((s) => s.go)
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(([id, label, icon]) => (
        <button
          key={id}
          className={tab === id ? 'on' : ''}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => {
            if (tab !== id) haptic('light')
            go(id)
          }}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
