import { ArrowLeft, FileText, Pencil } from 'lucide-react'
import { ProjectMovements } from '@/features/wallet/ProjectMovements'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge, Card, Select } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useClient, useClients, useMembers, useQuotes, useWorkshopSettings } from '@/data/hooks'
import type { Project } from '@/data/api'
import { STATUS_LABELS as QUOTE_STATUS_LABELS } from '@/domain/quoteLifecycle'
import { QUOTE_TONES, startQuote } from '@/features/quotes/shared'
import { formatDateEs, todayIso } from '@/domain/dates'
import { formatEuros } from '@/domain/money'
import { WORKSHOP_SHARE_KEY, formatPercent } from '@/domain/percent'
import { isDeliveryOverdue } from '@/domain/projects'
import { notifyError, notifyWrite } from '@/lib/notify'
import { PROJECT_STATUSES, ProjectDataSchema, type ProjectData, type ProjectStatus } from '@/model'
import { useProject } from '@/data/hooks'
import { ProjectContacts } from './ProjectContacts'
import { ProjectForm } from './ProjectForm'
import { STATUS_LABELS, STATUS_TONES, WORKSHOP_LABEL } from './labels'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const api = useData()
  const me = useMyEmail()
  const project = useProject(id)
  const client = useClient(project?.clientId ?? '')
  const clients = useClients()
  const members = useMembers()
  // Versión del proyecto al empezar a editar: si otro socio lo cambia mientras
  // tanto, no se pisa su cambio sin avisar.
  const [editingSince, setEditingSince] = useState<number | null>(null)
  const editing = editingSince !== null
  const today = todayIso()

  if (project === undefined) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (project === null) {
    return (
      <section className="flex flex-col gap-3">
        <p>No se encontró el proyecto.</p>
        <Link to="/proyectos" className="text-primary underline">
          Volver a proyectos
        </Link>
      </section>
    )
  }

  const save = (patch: Partial<ProjectData>, message: string) => {
    try {
      const next = ProjectDataSchema.parse({ ...project, ...patch })
      notifyWrite(api.updateProject(project.id, next, me), message)
      return true
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  const changeStatus = (status: ProjectStatus) => {
    // Al marcarlo entregado se completa la fecha de entrega real si faltaba; si
    // vuelve a pendiente / en proceso, deja de estar entregado.
    let deliveredAt = project.deliveredAt
    if (status === 'entregado' && !deliveredAt) deliveredAt = today
    if (status === 'pendiente' || status === 'en_proceso') deliveredAt = null
    save({ status, deliveredAt }, `Estado: ${STATUS_LABELS[status]}`)
  }

  const versionOf = (p: { updatedAt: { toMillis(): number } }) => p.updatedAt?.toMillis?.() ?? 0

  const memberName = (email: string) =>
    email === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (members?.find((m) => m.email === email)?.name ?? email)
  const overdue = isDeliveryOverdue(project, today)

  return (
    <section className="flex max-w-4xl flex-col gap-4">
      <Link to="/proyectos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Proyectos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {client && (
              <Link to={`/clientes/${client.id}`} className="text-primary hover:underline">
                {client.name}
              </Link>
            )}
            <Badge tone={STATUS_TONES[project.status]}>{STATUS_LABELS[project.status]}</Badge>
            {overdue && <Badge tone="danger">Entrega vencida</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="project-status" className="sr-only">
            Cambiar estado
          </label>
          <Select
            id="project-status"
            className="w-auto"
            value={project.status}
            // Mientras se edita no se cambia el estado: guardaría al instante y
            // el formulario se rechazaría como si otro socio lo hubiera cambiado.
            disabled={editing}
            title={editing ? 'Guardá o cancelá la edición para cambiar el estado' : undefined}
            onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          {!editing && (
            <Button variant="outline" onClick={() => setEditingSince(versionOf(project))}>
              <Pencil /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card>
        {editing && clients && members ? (
          <ProjectForm
            clients={clients}
            members={members}
            initial={project}
            initialShares={project.shares}
            submitLabel="Guardar cambios"
            onCancel={() => setEditingSince(null)}
            onSubmit={(values) => {
              if (versionOf(project) !== editingSince) {
                notifyError(
                  new Error('Otro socio modificó este proyecto mientras editabas. Cancelá y volvé a editar para ver sus cambios.'),
                )
                return false
              }
              const ok = save(values, 'Proyecto actualizado')
              if (ok) setEditingSince(null)
              return ok
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <dl className="grid gap-3 text-sm">
              {project.summary && (
                <div>
                  <dt className="text-muted-foreground">Resumen</dt>
                  <dd className="whitespace-pre-wrap">{project.summary}</dd>
                </div>
              )}
              <DateRow label="Solicitado" value={project.requestedAt} />
              <DateRow label="Presupuestado" value={project.quotedAt} />
              <DateRow label="Entrega comprometida" value={project.promisedDeliveryAt} />
              <DateRow label="Entregado" value={project.deliveredAt} />
              <div>
                <dt className="text-muted-foreground">Gastos estimados</dt>
                <dd>{project.estimatedCostCents != null ? formatEuros(project.estimatedCostCents) : '—'}</dd>
              </div>
              {project.notes && (
                <div>
                  <dt className="text-muted-foreground">Notas</dt>
                  <dd className="whitespace-pre-wrap">{project.notes}</dd>
                </div>
              )}
            </dl>
            <div>
              <h2 className="mb-2 text-sm font-medium">Participación en la ganancia</h2>
              <ul aria-label="Participación" className="flex flex-col gap-1 text-sm">
                {Object.entries(project.shares)
                  .sort(([a], [b]) => (a === WORKSHOP_SHARE_KEY ? 1 : b === WORKSHOP_SHARE_KEY ? -1 : 0))
                  .map(([k, bp]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span>{memberName(k)}</span>
                      <span className="tabular-nums">{formatPercent(bp)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      {client && <ProjectContacts client={client} projectId={project.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <FileText className="size-4" aria-hidden /> Presupuestos
          </h2>
          <ProjectQuotes project={project} />
        </Card>
      </div>
      <ProjectMovements projectId={project.id} estimatedCostCents={project.estimatedCostCents} />
    </section>
  )
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ? formatDateEs(value) : '—'}</dd>
    </div>
  )
}

function ProjectQuotes({ project }: { project: Project }) {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const quotes = useQuotes()
  const settings = useWorkshopSettings()
  const mine = (quotes ?? []).filter((q) => q.projectId === project.id)
  // Evita crear dos borradores con un doble click / Enter antes de navegar.
  const busy = useRef(false)
  const [creating, setCreating] = useState(false)
  const create = () => {
    if (!settings || busy.current) return
    busy.current = true
    setCreating(true)
    try {
      navigate(`/presupuestos/${startQuote(api, me, project, settings.settings)}`)
    } catch (e) {
      busy.current = false
      setCreating(false)
      notifyError(e)
    }
  }
  return (
    <>
      {quotes === undefined ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay presupuestos para este proyecto.</p>
      ) : (
        <ul aria-label="Presupuestos del proyecto" className="flex flex-col divide-y divide-border text-sm">
          {mine.map((q) => (
            <li key={q.id}>
              <Link to={`/presupuestos/${q.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-primary">
                <span className="min-w-0 truncate">
                  {q.title} <span className="text-muted-foreground">v{q.version}</span>
                  {project.acceptedQuoteId === q.id && <span className="ml-1 text-xs text-primary">(aceptado)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatEuros(q.totals.totalCents)}</span>
                  <Badge tone={QUOTE_TONES[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button
        className="mt-3"
        variant="outline"
        disabled={!settings || creating}
        onClick={create}
      >
        Crear presupuesto
      </Button>
    </>
  )
}
