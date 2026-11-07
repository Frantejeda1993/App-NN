import { useAuth } from '@/auth/AuthProvider'
import { ContactAlerts } from '@/features/home/ContactAlerts'
import { FixedExpensesDue } from '@/features/home/FixedExpensesDue'

export function HomePage() {
  const { user } = useAuth()
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0]

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Esto es lo que necesita atención hoy.</p>
      </div>
      <FixedExpensesDue />
      <ContactAlerts />
    </section>
  )
}
