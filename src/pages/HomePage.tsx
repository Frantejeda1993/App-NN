import { useAuth } from '@/auth/AuthProvider'

export function HomePage() {
  const { user } = useAuth()
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0]

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName}</h1>
      <p className="mt-1 text-muted-foreground">
        Acá vas a ver las alertas de contacto, el resumen de la billetera y los proyectos activos.
      </p>
    </section>
  )
}
