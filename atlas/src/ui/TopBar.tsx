import { useViewer } from '../state/store'
import { SearchBar } from './SearchBar'

/** 3D Atlas header: brand and beta label, skeleton toggle, search. */
export function TopBar() {
  const sex = useViewer((s) => s.sex)
  const setSex = useViewer((s) => s.setSex)
  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">ATLAS</span>
          <span className="beta" title="Content is a draft until academically reviewed">Beta</span>
        </div>
      </div>
      <div className="topbar-row">
        <div className="segmented sex-toggle" role="radiogroup" aria-label="Skeleton">
          <button role="radio" aria-checked={sex === 'male'} className={sex === 'male' ? 'on' : ''} onClick={() => setSex('male')}>
            Male
          </button>
          <button role="radio" aria-checked={sex === 'female'} className={sex === 'female' ? 'on' : ''} onClick={() => setSex('female')}>
            Female
          </button>
        </div>
        <SearchBar />
      </div>
    </header>
  )
}
