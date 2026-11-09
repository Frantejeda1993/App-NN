import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useClients, useProjects, useQuotes, useWorkshopSettings } from '@/data/hooks'
import { formatDateEs } from '@/domain/dates'
import { formatEuros } from '@/domain/money'
import { STATUS_LABELS } from '@/domain/quoteLifecycle'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { QUOTE_GROUPS, QUOTE_GROUP_LABELS, QUOTE_TONES, inQuoteGroup, startQuote, type QuoteGroup } from './shared'

/** `/presupuestos`: lista con filtros por estado y búsqueda. */
export function QuotesListPage() {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const quotes = useQuotes()
  const projects = useProjects()
  const clients = useClients()
  const settings = useWorkshopSettings()
  const [group, setGroup] = useState<QuoteGroup>('abiertos')
  const [query, setQuery] = useState('')

  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects])
  const clientById = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients])
  const q = query.trim().toLocaleLowerCase('es')
  const filtered = (quotes ?? []).filter((x) => {
    if (!inQuoteGroup(x.status, group)) return false
    if (!q) return true
    const hay = [x.title, projectById.get(x.projectId ?? '')?.title, clientById.get(x.clientId ?? '')?.name]
    return hay.some((s) => s?.toLocaleLowerCase('es').includes(q))
  })

  const create = () => {
    if (!settings) return
    try {
      navigate(`/presupuestos/${startQuote(api, me, null, settings.settings)}`)
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
        <Button onClick={create} disabled={!settings}>
          <Plus /> Nuevo presupuesto
        </Button>
      </div>

      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-1">
        {QUOTE_GROUPS.map((g) => (
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
            {QUOTE_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por título, proyecto o cliente"
          aria-label="Buscar presupuestos"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {quotes === undefined ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {quotes.length === 0
            ? 'Todavía no hay presupuestos. Creá el primero (o desde un proyecto).'
            : 'No hay presupuestos con este filtro.'}
        </Card>
      ) : (
        <ul
          aria-label="Presupuestos"
          className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
        >
          {filtered.map((x) => {
            const project = x.projectId ? projectById.get(x.projectId) : undefined
            const client = clientById.get(x.clientId ?? project?.clientId ?? '')
            return (
              <li key={x.id}>
                <Link to={`/presupuestos/${x.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {x.title} {x.version > 1 && <span className="text-muted-foreground">· v{x.version}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[client?.name, project?.title].filter(Boolean).join(' · ') || 'Sin proyecto'}
                      {` · ${x.items.length} mueble${x.items.length === 1 ? '' : 's'}`}
                      {x.validUntil && ` · válido hasta ${formatDateEs(x.validUntil)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium tabular-nums">{formatEuros(x.totals.totalCents)}</span>
                    <Badge tone={QUOTE_TONES[x.status]}>{STATUS_LABELS[x.status]}</Badge>
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
