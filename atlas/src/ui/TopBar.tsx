import { useViewer } from '../state/store'
import { MenuIcon } from './Icons'
import { SearchBar } from './SearchBar'
import { useToast } from './toastStore'

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const sex = useViewer((s) => s.sex)
  const setSex = useViewer((s) => s.setSex)
  const toast = useToast((s) => s.show)
  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">ATLAS</span>
          <span className="beta" title="Content is a draft until academically reviewed">Beta — under academic review</span>
        </div>
        <button className="icon-btn" onClick={onMenu} aria-label="Menu">
          <MenuIcon />
        </button>
      </div>
      <div className="topbar-row">
        <div className="segmented sex-toggle" role="radiogroup" aria-label="Skeleton">
          <button role="radio" aria-checked={sex === 'male'} className={sex === 'male' ? 'on' : ''} onClick={() => setSex('male')}>
            Male
          </button>
          <button
            role="radio"
            aria-checked={sex === 'female'}
            aria-disabled
            className="soon"
            onClick={() => toast('The female skeleton is added in the next build step.')}
          >
            Female
          </button>
        </div>
        <SearchBar />
      </div>
    </header>
  )
}
