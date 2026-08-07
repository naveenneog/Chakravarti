import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cleanupStaleServiceWorker } from './serviceWorkerCleanup'

// Fire and forget: the native build must not keep serving a previous APK's
// bundle out of a service worker precache that outlived the upgrade.
void cleanupStaleServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
