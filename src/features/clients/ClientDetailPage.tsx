import { ArrowLeft, Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useAllMembers, useClient, useContacts, useProjects, useWorkshopSettings } from '@/data/hooks'
import { STATUS_LABELS, STATUS_TONES } from '@/features/projects/labels'
import { whatsappLink } from '@/domain/clients'
import { formatDateEs, relativeDays, todayIso } from '@/domain/dates'
import { notifyError, notifyWrite } from '@/lib/notify'
import { ClientForm } from './ClientForm'
import { ContactForm } from './ContactForm'
import { CHANNEL_LABELS } from './labels'
import { ClientDataSchema } from '@/model'
import { ContactStatusBadge } from './ContactStatusBadge'
import { Loading } from '@/components/ui/loading'

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const api = useData()
  const me = useMyEmail()
  const client = useClient(id)
  const contacts = useContacts(id)
  // Solo para el nombre de quién cargó cada contacto: incluye al administrador.
  const members = useAllMembers()
  const settings = useWorkshopSettings()
  const allProjects = useProjects()
  // Versión del cliente al empezar a editar (para no pisar cambios de otro socio).
  const [editingSince, setEditingSince] = useState<number | null>(null)
  const editing = editingSince !== null
  const today = todayIso()

  const projects = useMemo(() => (allProjects ?? []).filter((p) => p.clientId === id), [allProjects, id])
  const projectTitle = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects])

  const memberName = useMemo(() => {
    const map = new Map((members ?? []).map((m) => [m.email, m.name]))
    return (email: string) => map.get(email) ?? email
  }, [members])

  if (client === undefined) return <Loading />
  if (client === null) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró el cliente.</p>
        <Link to="/clientes" className="text-primary underline">
          Volver a clientes
        </Link>
      </section>
    )
  }

  const wa = whatsappLink(client.phone)
  const version = client.updatedAt?.toMillis?.() ?? 0

  return (
    <section className="flex max-w-4xl flex-col gap-4">
      <Link to="/clientes" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {client.source && <span>Origen: {client.source}</span>}
            <ContactStatusBadge client={client} today={today} alertDays={settings?.settings.contactAlertDays ?? 14} />
            {!client.followUp && <Badge tone="muted">Sin seguimiento</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
              <MessageCircle /> WhatsApp
            </a>
          )}
          {!editing && (
            <Button variant="outline" onClick={() => setEditingSince(version)}>
              <Pencil /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card>
        {editing ? (
          <ClientForm
            initial={client}
            submitLabel="Guardar cambios"
            onCancel={() => setEditingSince(null)}
            onSubmit={(values) => {
              if (version !== editingSince) {
                notifyError(
                  new Error('Este cliente cambió mientras editabas (otro socio o un contacto nuevo). Cancelá y volvé a editar.'),
                )
                return
              }
              try {
                // Se envía el cliente completo para no perder fechas de contacto.
                const next = ClientDataSchema.parse({ ...client, ...values })
                notifyWrite(api.updateClient(client.id, next, me), 'Cliente actualizado')
                setEditingSince(null)
              } catch (e) {
                notifyError(e)
              }
            }}
          />
        ) : (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Info icon={<Phone className="size-4" />} label="Teléfono" value={client.phone} />
            <Info icon={<Mail className="size-4" />} label="Email" value={client.email} />
            <Info icon={<MapPin className="size-4" />} label="Dirección" value={client.address} />
            <Info
              label="Último contacto"
              value={client.lastContactAt ? `${formatDateEs(client.lastContactAt)} (${relativeDays(client.lastContactAt, today)})` : ''}
            />
            {client.notes && (
              <div className="md:col-span-2">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap">{client.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Proyectos</h2>
          <Link to={`/proyectos/nuevo?cliente=${client.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Plus /> Nuevo proyecto
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este cliente todavía no tiene proyectos.</p>
        ) : (
          <ul aria-label="Proyectos del cliente" className="flex flex-col gap-1">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/proyectos/${p.id}`} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <span className="truncate">{p.title}</span>
                  <Badge tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Registrar contacto</h2>
        <ContactForm
          onSubmit={(v) => {
            try {
              const res = api.addContact(
                client,
                { date: v.date, channel: v.channel, note: v.note },
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

      <Card>
        <h2 className="mb-3 font-semibold">Historial de contactos</h2>
        {contacts === undefined ? (
          <Loading />
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay contactos registrados.</p>
        ) : (
          <ol aria-label="Historial de contactos" className="flex flex-col gap-3">
            {contacts.map((k) => (
              <li key={k.id} className="border-l-2 border-primary/40 pl-3">
                <p className="text-sm">
                  <span className="font-medium">{formatDateEs(k.date)}</span> · {CHANNEL_LABELS[k.channel]} ·{' '}
                  <span className="text-muted-foreground">por {memberName(k.createdBy)}</span>
                  {k.projectId && projectTitle.has(k.projectId) && (
                    <span className="text-muted-foreground"> · {projectTitle.get(k.projectId)}</span>
                  )}
                </p>
                {k.note && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{k.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  )
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}
