import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/archivo-narrow/500.css'
import '@fontsource/archivo-narrow/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@xyflow/react/dist/style.css'
import './theme/tokens.css'
import './theme/base.css'
import { App } from './App'
import { applyPreference, loadPreference, safeLocalStorage } from './theme/themePreference'
import { installE2EHooks } from './dev/e2eHooks'

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')
if (window.avwan.isE2E) installE2EHooks()
applyPreference(loadPreference(safeLocalStorage()), document.documentElement)
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
