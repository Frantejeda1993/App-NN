import { LogOut, Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav'

function UserBadge() {
  const { user } = useAuth()
  const name = user?.displayName ?? user?.email ?? ''
  return (
    <div className="flex min-w-0 items-center gap-2">
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-sm">{name}</span>
    </div>
  )
}

export function AppShell() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      {/* Menú lateral: PC / tablet */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-card md:flex">
        <div className="px-5 py-5 text-lg font-semibold tracking-tight">
          Taller <span className="text-primary">NN</span>
        </div>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-1 border-t border-border p-3">
          <UserBadge />
          <div className="flex shrink-0">
            <Link to="/ajustes" aria-label="Ajustes" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <Settings />
            </Link>
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => void signOut()}>
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Cabecera: celular */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <span className="font-semibold">
            Taller <span className="text-primary">NN</span>
          </span>
          <div className="flex">
            <Link to="/ajustes" aria-label="Ajustes" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <Settings />
            </Link>
            <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => void signOut()}>
              <LogOut />
            </Button>
          </div>
        </header>
        <Toaster position="top-center" richColors closeButton />

        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <Outlet />
        </main>

        {/* Barra inferior: celular */}
        <nav
          aria-label="Principal móvil"
          className="fixed inset-x-0 bottom-0 z-10 grid auto-cols-fr grid-flow-col border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px]',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
