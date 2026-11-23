import { lazy, Suspense, useState } from 'react'
import { useResolvedTheme } from './lib/theme'
import { usePrefs, useViewer } from './state/store'
import { TopBar } from './ui/TopBar'
import { Dock } from './ui/Dock'
import { HudReadout } from './ui/HudReadout'
import { ExplodeBar } from './ui/ExplodeBar'
import { InfoPanel } from './ui/InfoPanel'
import { LabelsOverlay } from './ui/LabelsOverlay'
import { Loader } from './ui/Loader'
import { Disclaimer } from './ui/Disclaimer'
import { Menu } from './ui/Menu'
import { Toast } from './ui/Toast'
import { useSession } from './learn/session'


const Viewer = lazy(() => import('./viewer/Viewer'))
// Study and progress screens load on first use (they bring FSRS and the session code).
const StudyLauncher = lazy(() => import('./ui/study/StudyLauncher').then((m) => ({ default: m.StudyLauncher })))
const StudySession = lazy(() => import('./ui/study/StudySession').then((m) => ({ default: m.StudySession })))
const ProgressScreen = lazy(() => import('./ui/ProgressScreen').then((m) => ({ default: m.ProgressScreen })))

export default function App() {
  const theme = useResolvedTheme()
  const loaded = useViewer((s) => s.loaded)
  const accepted = usePrefs((s) => s.disclaimerAccepted)
  const [menu, setMenu] = useState(false)
  const mode = useSession((s) => s.mode)
  const launcher = useSession((s) => s.launcher)
  const progress = useSession((s) => s.progress)
  return (
    <div className="app">
      <div className="stage" aria-label="3D skeleton. Drag to rotate, pinch to zoom, two fingers to pan, tap a bone to select it, double-tap to focus.">
        <Suspense fallback={null}>
          <Viewer theme={theme} />
        </Suspense>
      </div>
      <div className="hud-frame" aria-hidden />
      {mode ? (
        <Suspense fallback={null}>
          <StudySession key={mode} mode={mode} />
        </Suspense>
      ) : (
        <>
          <LabelsOverlay />
          <TopBar onMenu={() => setMenu(true)} />
          <HudReadout />
          <ExplodeBar />
          <Dock />
          <InfoPanel />
        </>
      )}
      <Loader done={loaded} />
      <Toast />
      {menu && <Menu onClose={() => setMenu(false)} />}
      <Suspense fallback={null}>
        {launcher && !mode && <StudyLauncher />}
        {progress && !mode && <ProgressScreen onClose={() => useSession.getState().setProgress(false)} />}
      </Suspense>
      {!accepted && <Disclaimer />}
    </div>
  )
}
