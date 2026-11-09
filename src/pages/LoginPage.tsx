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
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <Logo className="mb-4 size-20 rounded-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Taller <span className="text-primary">NN</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Proyectos, billetera y presupuestos del taller.</p>

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

        <Button className="mt-6 w-full" onClick={() => void handleSignIn()} disabled={busy}>
          Entrar con Google
        </Button>
      </div>
    </div>
  )
}
