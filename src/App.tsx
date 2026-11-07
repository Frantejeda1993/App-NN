import { Loader2 } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ClientNewPage } from '@/features/clients/ClientNewPage'
import { ClientsListPage } from '@/features/clients/ClientsListPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
        <Route path="clientes" element={<ClientsListPage />} />
        <Route path="clientes/nuevo" element={<ClientNewPage />} />
        <Route path="clientes/:id" element={<ClientDetailPage />} />
        <Route path="proyectos" element={<ComingSoonPage title="Proyectos" />} />
        <Route path="billetera" element={<ComingSoonPage title="Billetera" />} />
        <Route path="presupuestos" element={<ComingSoonPage title="Presupuestos" />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
