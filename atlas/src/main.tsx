import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/app.css'
import App from './App'
import { prewarmAudio } from './learn/sound'

// Unlock audio on the first touch, so the first click sound plays without delay.
prewarmAudio()

// Development only: expose stores for automated UI tests.
if (import.meta.env.DEV)
  void Promise.all([import('./state/store'), import('./state/progress'), import('./data/bones')]).then(([store, progress, bones]) =>
    Object.assign(window, { __atlas: { useViewer: store.useViewer, usePrefs: store.usePrefs, useProgress: progress.useProgress, BONE_BY_ID: bones.BONE_BY_ID } }),
  )

// Start downloading the 3D chunk (and, from it, the model) straight away.
void import('./viewer/Viewer')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
