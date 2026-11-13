import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Badge, Card, Input } from '@/components/ui/form'
import { useClients, useWorkshopSettings } from '@/data/hooks'
import { matchesSearch } from '@/domain/clients'
import { relativeDays, todayIso } from '@/domain/dates'
import { ContactStatusBadge } from './ContactStatusBadge'
import { Loading } from '@/components/ui/loading'

export function ClientsListPage() {
  const clients = useClients()
  const settings = useWorkshopSettings()
  const [query, setQuery] = useState('')
  const today = todayIso()

  const filtered = useMemo(() => (clients ?? []).filter((c) => matchesSearch(c, query)), [clients, query])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <Link to="/clientes/nuevo" className={buttonVariants()}>
          <Plus /> Nuevo cliente
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre, teléfono u origen"
          aria-label="Buscar clientes"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {clients === undefined ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {clients.length === 0 ? 'Todavía no hay clientes. Creá el primero.' : 'Ningún cliente coincide con la búsqueda.'}
        </Card>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/clientes/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.phone, c.source].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.lastContactAt ? <span>Último contacto {relativeDays(c.lastContactAt, today)}</span> : <span>Sin contactos</span>}
                  <ContactStatusBadge client={c} today={today} alertDays={settings?.settings.contactAlertDays ?? 14} />
                  {!c.followUp && <Badge tone="muted">Sin seguimiento</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
