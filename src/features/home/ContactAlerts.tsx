import { BellRing, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/form'
import { useClients, useWorkshopSettings } from '@/data/hooks'
import { contactAlerts } from '@/domain/clients'
import { relativeDays, todayIso } from '@/domain/dates'

export function ContactAlerts() {
  const clients = useClients()
  const settings = useWorkshopSettings()
  if (!clients || !settings) return null

  const today = todayIso()
  const days = settings.settings.contactAlertDays
  const { due, stale } = contactAlerts(clients, today, days)

  if (due.length === 0 && stale.length === 0) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellRing className="size-4" aria-hidden /> No hay clientes para contactar hoy.
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {due.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <BellRing className="size-4 text-destructive" aria-hidden /> Contactar hoy o vencidos
          </h2>
          <ul aria-label="Contactar hoy o vencidos" className="flex flex-col gap-1">
            {due.map((c) => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-muted-foreground">{relativeDays(c.nextContactAt!, today)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {stale.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-amber-600" aria-hidden /> Sin contacto hace más de {days} días
          </h2>
          <ul aria-label={`Sin contacto hace más de ${days} días`} className="flex flex-col gap-1">
            {stale.map((c) => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-muted-foreground">{relativeDays(c.lastContactAt!, today)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
