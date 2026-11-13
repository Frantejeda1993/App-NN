import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Logo } from '@/components/layout/Brand'
import { Button } from '@/components/ui/button'

export function LoginPage() {
  const { status, rejectedEmail, signIn, retry } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setError(null)
    setBusy(true)
    try {
      await signIn()
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('No se pudo iniciar sesión. Revisá la conexión e intentá de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    // Pizarra arriba y crema abajo, como el logo: la tarjeta queda entre las dos.
    <div className="grid min-h-dvh place-items-center bg-[linear-gradient(to_bottom,var(--sidebar)_0,var(--sidebar)_42%,var(--background)_42%)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <Logo className="mb-5 size-20 rounded-2xl" />
        <h1 className="text-3xl tracking-tight">
          Taller <span className="text-primary">NN</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Proyectos, billetera y presupuestos del taller.</p>

        {status === 'notMember' && rejectedEmail && (
          <p role="alert" className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {rejectedEmail} no tiene acceso. Pedile a un socio que te agregue a la lista de miembros.
          </p>
        )}
        {status === 'error' && (
          <div role="alert" className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            No se pudo verificar tu acceso (¿sin conexión?).{' '}
            <button className="font-medium underline" onClick={retry}>
              Reintentar
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button className="mt-8 w-full" onClick={() => void handleSignIn()} disabled={busy} aria-busy={busy}>
          {busy ? 'Entrando…' : 'Entrar con Google'}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">Solo para los socios del taller.</p>
      </div>
    </div>
  )
}
