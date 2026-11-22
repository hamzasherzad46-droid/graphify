import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/app.css'
import App from './App'

// Start downloading the 3D chunk (and, from it, the model) straight away.
void import('./viewer/Viewer')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
