import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { createFirebaseAuthService } from './auth/firebaseAuthService'
import { missingFirebaseEnv } from './lib/firebase'
import './index.css'

const root = createRoot(document.getElementById('root')!)

if (missingFirebaseEnv.length > 0) {
  root.render(
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Falta la configuración de Firebase</h1>
      <p>Definí estas variables en .env.local (ver .env.example): {missingFirebaseEnv.join(', ')}</p>
    </div>,
  )
} else {
  const authService = createFirebaseAuthService()
  root.render(
    <StrictMode>
      <AuthProvider service={authService}>
        {/* HashRouter: GitHub Pages no sabe resolver rutas de una SPA. */}
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </StrictMode>,
  )
}
