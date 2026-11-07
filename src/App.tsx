import { Loader2 } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { NAV_ITEMS } from '@/components/layout/nav'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'

export function AppRoutes() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando" />
      </div>
    )
  }

  if (status !== 'member') return <LoginPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        {NAV_ITEMS.filter((i) => i.to !== '/').map((i) => (
          <Route key={i.to} path={i.to.slice(1)} element={<ComingSoonPage title={i.label} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
