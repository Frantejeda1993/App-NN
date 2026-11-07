import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Badge, Card, Input } from '@/components/ui/form'
import { useClients, useProjects } from '@/data/hooks'
import { formatDateEs, relativeDays, todayIso } from '@/domain/dates'
import { STATUS_GROUPS, filterProjects, isDeliveryOverdue, type StatusGroup } from '@/domain/projects'
import { cn } from '@/lib/utils'
import { GROUP_LABELS, STATUS_LABELS, STATUS_TONES } from './labels'

export function ProjectsListPage() {
  const projects = useProjects()
  const clients = useClients()
  const [group, setGroup] = useState<StatusGroup>('activos')
  const [query, setQuery] = useState('')
  const today = todayIso()

  const clientById = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients])
  const clientNames = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.name])), [clients])
  const filtered = useMemo(
    () => filterProjects(projects ?? [], group, query, clientNames),
    [projects, group, query, clientNames],
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <Link to="/proyectos/nuevo" className={buttonVariants()}>
          <Plus /> Nuevo proyecto
        </Link>
      </div>

      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-1">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              group === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por título o cliente"
          aria-label="Buscar proyectos"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {projects === undefined ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {projects.length === 0 ? 'Todavía no hay proyectos. Creá el primero.' : 'No hay proyectos con este filtro.'}
        </Card>
      ) : (
        <ul aria-label="Proyectos" className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((p) => {
            const client = clientById.get(p.clientId)
            const overdue = isDeliveryOverdue(p, today)
            return (
              <li key={p.id}>
                <Link to={`/proyectos/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {client?.name ?? 'Cliente desconocido'}
                      {client?.lastContactAt && ` · último contacto ${relativeDays(client.lastContactAt, today)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {p.promisedDeliveryAt && (
                      <span className={overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                        Entrega {formatDateEs(p.promisedDeliveryAt)}
                        {overdue && ' (vencida)'}
                      </span>
                    )}
                    <Badge tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
