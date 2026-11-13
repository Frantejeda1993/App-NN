import { MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useContacts, useMembers } from '@/data/hooks'
import { byDateDesc, type Client } from '@/data/api'
import { whatsappLink } from '@/domain/clients'
import { formatDateEs, relativeDays, todayIso } from '@/domain/dates'
import { ContactForm } from '@/features/clients/ContactForm'
import { CHANNEL_LABELS } from '@/features/clients/labels'
import { notifyError, notifyWrite } from '@/lib/notify'

/**
 * Historial de contactos con el cliente dentro de la ficha del proyecto: por
 * defecto solo los vinculados a este proyecto, con opción de ver todos.
 * Permite registrar un contacto nuevo, que queda vinculado al proyecto.
 */
export function ProjectContacts({ client, projectId }: { client: Client; projectId: string }) {
  const api = useData()
  const me = useMyEmail()
  const contacts = useContacts(client.id)
  const members = useMembers()
  const [showAll, setShowAll] = useState(false)
  const today = todayIso()
  const wa = whatsappLink(client.phone)

  const memberName = useMemo(() => {
    const map = new Map((members ?? []).map((m) => [m.email, m.name]))
    return (email: string) => map.get(email) ?? email
  }, [members])

  const visible = useMemo(
    () => [...(contacts ?? [])].filter((k) => showAll || k.projectId === projectId).sort(byDateDesc),
    [contacts, showAll, projectId],
  )

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Contactos con {client.name}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {client.lastContactAt ? `Último contacto ${relativeDays(client.lastContactAt, today)}` : 'Sin contactos'}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <MessageCircle /> WhatsApp
            </a>
          )}
        </div>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Ver todos los contactos del cliente
      </label>

      {contacts === undefined ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showAll ? 'Todavía no hay contactos con este cliente.' : 'Todavía no hay contactos registrados para este proyecto.'}
        </p>
      ) : (
        <ol aria-label="Contactos del proyecto" className="flex flex-col gap-3">
          {visible.map((k) => (
            <li key={k.id} className="border-l-2 border-primary/40 pl-3">
              <p className="flex flex-wrap items-center gap-1 text-sm">
                <span className="font-medium">{formatDateEs(k.date)}</span> · {CHANNEL_LABELS[k.channel]} ·{' '}
                <span className="text-muted-foreground">por {memberName(k.createdBy)}</span>
                {showAll && k.projectId === projectId && <Badge>Este proyecto</Badge>}
              </p>
              {k.note && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{k.note}</p>}
            </li>
          ))}
        </ol>
      )}

      <h3 className="mb-2 mt-4 text-sm font-medium">Registrar contacto</h3>
      <ContactForm
        onSubmit={(v) => {
          try {
            const res = api.addContact(
              client,
              { date: v.date, channel: v.channel, note: v.note, projectId },
              v.nextContactAt === '' ? null : v.nextContactAt,
              me,
            )
            notifyWrite(res, 'Contacto registrado')
            return true
          } catch (e) {
            notifyError(e)
            return false
          }
        }}
      />
    </Card>
  )
}
