import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card, Field, Input, Select } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useMovements } from '@/data/hooks'
import { formatEuros } from '@/domain/money'
import { boxBalances, filterMovements, memberDebts, type MovementFilters } from '@/domain/wallet'
import { notifyError, notifyWrite } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { BoxDataSchema, MOVEMENT_TYPES, type MovementType } from '@/model'
import { MovementRow } from './MovementRow'
import { TYPE_LABELS } from './labels'
import { useWalletNames } from './useWalletNames'

const TABS = { movimientos: 'Movimientos', cajas: 'Cajas' } as const
type Tab = keyof typeof TABS

export function WalletPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'cajas' ? 'cajas' : 'movimientos'

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Billetera</h1>
        <Link to="/billetera/nuevo" className={buttonVariants()}>
          <Plus /> Nuevo movimiento
        </Link>
      </div>
      <div role="tablist" aria-label="Billetera" className="flex gap-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParams(t === 'movimientos' ? {} : { tab: t })}
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {TABS[t]}
          </button>
        ))}
      </div>
      {tab === 'movimientos' ? <MovementsTab /> : <BoxesTab />}
    </section>
  )
}

function MovementsTab() {
  const movements = useMovements()
  const names = useWalletNames()
  const [filters, setFilters] = useState<MovementFilters>({})
  const set = (patch: Partial<MovementFilters>) => setFilters((f) => ({ ...f, ...patch }))

  const filtered = useMemo(() => filterMovements(movements ?? [], filters), [movements, filters])
  const debts = useMemo(() => memberDebts(movements ?? []), [movements])
  const owed = Object.entries(debts).filter(([, c]) => c > 0)

  if (!movements || names.loading) return <p className="text-sm text-muted-foreground">Cargando…</p>

  return (
    <div className="flex flex-col gap-4">
      {owed.length > 0 && (
        <Card className="text-sm">
          <p className="font-medium">El taller les debe (gastos pagados de su bolsillo)</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {owed.map(([email, cents]) => (
              <li key={email}>
                {names.memberName(email)}: <span className="font-medium text-foreground">{formatEuros(cents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="f-type" label="Tipo">
            <Select id="f-type" value={filters.type ?? ''} onChange={(e) => set({ type: (e.target.value || undefined) as MovementType | undefined })}>
              <option value="">Todos</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-box" label="Caja">
            <Select id="f-box" value={filters.boxId ?? ''} onChange={(e) => set({ boxId: e.target.value || undefined })}>
              <option value="">Todas</option>
              {names.boxes!.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-project" label="Proyecto">
            <Select id="f-project" value={filters.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || undefined })}>
              <option value="">Todos</option>
              {names.projects!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-member" label="Socio">
            <Select id="f-member" value={filters.member ?? ''} onChange={(e) => set({ member: e.target.value || undefined })}>
              <option value="">Todos</option>
              {names.members!.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-from" label="Desde">
            <Input id="f-from" type="date" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
          </Field>
          <Field id="f-to" label="Hasta">
            <Input id="f-to" type="date" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" className="size-4" checked={!!filters.showDeleted} onChange={(e) => set({ showDeleted: e.target.checked })} />
            Mostrar eliminados
          </label>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          {movements.length === 0 ? 'Todavía no hay movimientos.' : 'No hay movimientos con estos filtros.'}
        </Card>
      ) : (
        <ul aria-label="Movimientos" className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((m) => (
            <MovementRow key={m.id} m={m} summary={names.summary(m)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function BoxesTab() {
  const api = useData()
  const me = useMyEmail()
  const movements = useMovements()
  const { boxes } = useWalletNames()
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  const balances = useMemo(
    () => boxBalances(movements ?? [], (boxes ?? []).map((b) => b.id)),
    [movements, boxes],
  )
  if (!boxes || !movements) return <p className="text-sm text-muted-foreground">Cargando…</p>
  const total = boxes.filter((b) => b.active).reduce((s, b) => s + balances[b.id], 0)

  const save = (fn: () => ReturnType<typeof api.createBox>, msg: string) => {
    try {
      notifyWrite(fn(), msg)
      return true
    } catch (e) {
      notifyError(e)
      return false
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Saldo por caja</h2>
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatEuros(total)}</span>
          </span>
        </div>
        {boxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Creá la primera caja (por ejemplo Efectivo o Banco).</p>
        ) : (
          <ul aria-label="Cajas" className="flex flex-col divide-y divide-border">
            {boxes.map((b) => (
              <li key={b.id} className={cn('flex flex-wrap items-center justify-between gap-2 py-2', !b.active && 'opacity-60')}>
                {renaming?.id === b.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (save(() => api.updateBox(b.id, BoxDataSchema.parse({ ...b, name: renaming.name }), me), 'Caja renombrada')) setRenaming(null)
                    }}
                  >
                    <Input aria-label="Nuevo nombre" value={renaming.name} onChange={(e) => setRenaming({ id: b.id, name: e.target.value })} />
                    <Button type="submit" size="sm">
                      Guardar
                    </Button>
                  </form>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    {b.name} {!b.active && <Badge tone="muted">Inactiva</Badge>}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn('tabular-nums text-sm font-medium', balances[b.id] < 0 && 'text-destructive')}>
                    {formatEuros(balances[b.id])}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setRenaming({ id: b.id, name: b.name })}>
                    Renombrar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Una caja con dinero no se desactiva: el total dejaría de mostrarlo.
                      if (b.active && balances[b.id] !== 0) {
                        notifyError(new Error(`${b.name} tiene ${formatEuros(balances[b.id])}. Transferí el saldo antes de desactivarla.`))
                        return
                      }
                      save(
                        () => api.updateBox(b.id, BoxDataSchema.parse({ ...b, active: !b.active }), me),
                        b.active ? 'Caja desactivada' : 'Caja reactivada',
                      )
                    }}
                  >
                    {b.active ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (save(() => api.createBox({ name: newName }, me), 'Caja creada')) setNewName('')
          }}
        >
          <Field id="new-box" label="Nueva caja" className="min-w-48 flex-1">
            <Input id="new-box" placeholder="Efectivo, Banco, Bizum…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!newName.trim()}>
            <Plus /> Crear caja
          </Button>
        </form>
      </Card>
    </div>
  )
}
