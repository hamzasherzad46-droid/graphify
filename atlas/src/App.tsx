import { lazy, Suspense, useState } from 'react'
import { useResolvedTheme } from './lib/theme'
import { usePrefs, useViewer } from './state/store'
import { TopBar } from './ui/TopBar'
import { Dock } from './ui/Dock'
import { HudReadout } from './ui/HudReadout'
import { InfoPanel } from './ui/InfoPanel'
import { LabelsOverlay } from './ui/LabelsOverlay'
import { Loader } from './ui/Loader'
import { Disclaimer } from './ui/Disclaimer'
import { Menu } from './ui/Menu'
import { Toast } from './ui/Toast'

const Viewer = lazy(() => import('./viewer/Viewer'))

export default function App() {
  const theme = useResolvedTheme()
  const loaded = useViewer((s) => s.loaded)
  const accepted = usePrefs((s) => s.disclaimerAccepted)
  const [menu, setMenu] = useState(false)
  return (
    <div className="app">
      <div className="stage" aria-label="3D skeleton. Drag to rotate, pinch to zoom, two fingers to pan, tap a bone to select it, double-tap to focus.">
        <Suspense fallback={null}>
          <Viewer theme={theme} />
        </Suspense>
      </div>
      <div className="hud-frame" aria-hidden />
      <LabelsOverlay />
      <TopBar onMenu={() => setMenu(true)} />
      <HudReadout />
      <Dock />
      <InfoPanel />
      <Loader done={loaded} />
      <Toast />
      {menu && <Menu onClose={() => setMenu(false)} />}
      {!accepted && <Disclaimer />}
    </div>
  )
}
