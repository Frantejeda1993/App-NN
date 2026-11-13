import { LogOut, Settings } from 'lucide-react'
import { Brand } from './Brand'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { TourProvider } from '@/features/tour/TourProvider'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav'

/** Botones de ícono sobre el menú pizarra (contraste propio, no el del fondo crema). */
const sidebarIconButton = 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-offset-sidebar'

function UserBadge() {
  const { user } = useAuth()
  const name = user?.displayName ?? user?.email ?? ''
  return (
    <div className="flex min-w-0 items-center gap-2">
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" className="size-8 rounded-full ring-2 ring-sidebar-border" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-sm text-sidebar-foreground" title={name}>
        {name}
      </span>
    </div>
  )
}

export function AppShell() {
  const { signOut } = useAuth()

  return (
    // minmax(0,1fr): la columna principal puede encogerse; las tablas anchas scrollean dentro de su tarjeta.
    <TourProvider>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <div className="min-h-dvh bg-background text-foreground md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
        {/* Menú lateral: PC / tablet. Pizarra, como el lado oscuro del logo. */}
        <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground md:flex">
          <div className="px-5 pb-6 pt-6 text-lg">
            <Brand logoClassName="size-10" onDark />
          </div>
          <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5 px-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary',
                    isActive
                      ? 'bg-sidebar-accent font-medium text-sidebar-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-primary'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-[18px]', isActive && 'text-sidebar-primary')} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-1 border-t border-sidebar-border p-3">
            <UserBadge />
            <div className="flex shrink-0">
              <Link to="/ajustes" aria-label="Ajustes" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), sidebarIconButton)}>
                <Settings />
              </Link>
              <Button variant="ghost" size="icon" aria-label="Cerrar sesión" className={sidebarIconButton} onClick={() => void signOut()}>
                <LogOut />
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col">
          {/* Cabecera: celular */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
            <Brand />
            <div className="flex">
              <Link to="/ajustes" aria-label="Ajustes" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
                <Settings />
              </Link>
              <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => void signOut()}>
                <LogOut />
              </Button>
            </div>
          </header>
          <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />

          <main id="contenido" tabIndex={-1} className="flex-1 px-4 pb-28 pt-6 focus:outline-none md:px-10 md:pb-10 md:pt-8">
            <Outlet />
          </main>

          {/* Barra inferior: celular (≤ 6 destinos, ícono + texto, activo marcado). */}
          <nav
            aria-label="Principal móvil"
            className="fixed inset-x-0 bottom-0 z-20 grid auto-cols-fr grid-flow-col border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_oklch(0.3_0.03_55/0.2)] backdrop-blur md:hidden"
          >
            {NAV_ITEMS.map(({ to, label, short, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] leading-tight transition-colors',
                    isActive ? 'font-semibold text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-7 w-11 place-items-center rounded-full transition-colors', isActive && 'bg-accent')}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {short ? (
                      // Se ve el rótulo corto; los lectores de pantalla leen el nombre completo.
                      <>
                        <span aria-hidden className="max-w-full truncate px-0.5">
                          {short}
                        </span>
                        <span className="sr-only">{label}</span>
                      </>
                    ) : (
                      <span className="max-w-full truncate px-0.5">{label}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </TourProvider>
  )
}
