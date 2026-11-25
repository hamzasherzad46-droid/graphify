import { lazy, Suspense } from 'react'
import { useResolvedTheme } from './lib/theme'
import { usePrefs, useViewer } from './state/store'
import { useNav } from './state/nav'
import { TopBar } from './ui/TopBar'
import { Dock } from './ui/Dock'
import { HudReadout } from './ui/HudReadout'
import { ExplodeBar } from './ui/ExplodeBar'
import { InfoPanel } from './ui/InfoPanel'
import { LabelsOverlay } from './ui/LabelsOverlay'
import { Loader } from './ui/Loader'
import { Disclaimer } from './ui/Disclaimer'
import { Toast } from './ui/Toast'
import { TabBar } from './ui/TabBar'
import { BackIcon } from './ui/Icons'
import { HomeScreen } from './ui/home/HomeScreen'
import { useSession } from './learn/session'

const Viewer = lazy(() => import('./viewer/Viewer'))
// Practice, Progress, You and study sessions load on first use (they bring FSRS and the session code).
const StudyLauncher = lazy(() => import('./ui/study/StudyLauncher').then((m) => ({ default: m.StudyLauncher })))
const StudySession = lazy(() => import('./ui/study/StudySession').then((m) => ({ default: m.StudySession })))
const ProgressScreen = lazy(() => import('./ui/ProgressScreen').then((m) => ({ default: m.ProgressScreen })))
const LessonsRouter = lazy(() => import('./ui/lessons/LessonsRouter').then((m) => ({ default: m.LessonsRouter })))
const YouScreen = lazy(() => import('./ui/YouScreen').then((m) => ({ default: m.YouScreen })))

/**
 * Opens on Home. The 3D Atlas stays mounted underneath (so switching to it is instant and the model loads once);
 * other tabs are opaque pages over it. Study sessions take the whole screen.
 */
export default function App() {
  const theme = useResolvedTheme()
  const loaded = useViewer((s) => s.loaded)
  const accepted = usePrefs((s) => s.disclaimerAccepted)
  const mode = useSession((s) => s.mode)
  const tab = useNav((s) => s.tab)
  const pages = useNav((s) => s.pages)
  const returnTo = useNav((s) => s.returnTo)
  const in3d = tab === '3d' && !mode
  return (
    <div className={`app tab-${mode ? 'study' : tab}`}>
      <div className="stage" aria-hidden={!in3d && !mode} aria-label="3D skeleton. Drag to rotate, pinch to zoom, two fingers to pan, tap a bone to select it, double-tap to focus.">
        <Suspense fallback={null}>
          <Viewer theme={theme} paused={!in3d && !mode} />
        </Suspense>
      </div>
      {mode ? (
        <Suspense fallback={null}>
          <StudySession key={mode} mode={mode} />
        </Suspense>
      ) : (
        <>
          {in3d && (
            <>
              <div className="hud-frame" aria-hidden />
              <LabelsOverlay />
              <TopBar />
              <HudReadout />
              <ExplodeBar />
              <Dock />
              <InfoPanel />
              <Loader done={loaded} />
              {returnTo && (
                <button className="back-pill" onClick={() => useNav.getState().go('home')}>
                  <BackIcon /> Back to {returnTo}
                </button>
              )}
            </>
          )}
          {tab === 'home' && !pages.length && <HomeScreen />}
          <Suspense fallback={<div className="tab-page" />}>
            {tab === 'home' && pages.length > 0 && <LessonsRouter page={pages[pages.length - 1]} depth={pages.length} />}
            {tab === 'practice' && <StudyLauncher />}
            {tab === 'progress' && <ProgressScreen />}
            {tab === 'you' && <YouScreen />}
          </Suspense>
          <TabBar />
        </>
      )}
      <Toast />
      {!accepted && <Disclaimer />}
    </div>
  )
}
