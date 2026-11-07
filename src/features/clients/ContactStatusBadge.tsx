import { Badge } from '@/components/ui/form'
import { contactAlerts, type AlertableClient } from '@/domain/clients'
import { relativeDays } from '@/domain/dates'

/** Etiqueta de seguimiento de un cliente: "Contactar hoy", "Vencido…", "Sin contacto…". */
export function ContactStatusBadge({
  client,
  today,
  alertDays,
}: {
  client: AlertableClient
  today: string
  alertDays: number
}) {
  const { due, stale } = contactAlerts([client], today, alertDays)
  if (due.length > 0) {
    const when = client.nextContactAt!
    return <Badge tone="danger">{when === today ? 'Contactar hoy' : `Contactar (vencido ${relativeDays(when, today)})`}</Badge>
  }
  if (stale.length > 0) return <Badge tone="warning">Sin contacto {relativeDays(client.lastContactAt!, today)}</Badge>
  if (client.followUp && client.nextContactAt) {
    return <Badge tone="muted">Contactar {relativeDays(client.nextContactAt, today)}</Badge>
  }
  return null
}
