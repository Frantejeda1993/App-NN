import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/form'
import { useBoxes, useGeneralExpenses, useMembers, useMovements, useProjects, useQuotes } from '@/data/hooks'
import { allocations, futureIncome, pendingExpenses, projectCollection } from '@/domain/dashboard'
import { formatEuros } from '@/domain/money'
import { WORKSHOP_SHARE_KEY } from '@/domain/percent'
import { boxBalances } from '@/domain/wallet'
import { WORKSHOP_LABEL } from '@/features/projects/labels'
import { cn } from '@/lib/utils'

const money = (c: number) => formatEuros(c)

export function DashboardTab() {
  const boxes = useBoxes()
  const members = useMembers()
  const projects = useProjects()
  const generalExpenses = useGeneralExpenses()
  const movements = useMovements()
  const quotes = useQuotes()

  const data = useMemo(() => {
    if (!boxes || !members || !projects || !generalExpenses || !movements || !quotes) return null
    const balances = boxBalances(movements, boxes.map((b) => b.id))
    const cash = Object.values(balances).reduce((s, v) => s + v, 0)
    const pending = pendingExpenses(movements)
    const alloc = allocations({
      members: members.filter((m) => m.active).map((m) => m.email),
      projects,
      generalExpenses,
      movements,
      quotes,
    })
    const debts = Object.entries(alloc)
      .filter(([k]) => k !== WORKSHOP_SHARE_KEY)
      .reduce((s, [, a]) => s + Math.max(0, a.debt), 0)
    const sumTotals = Object.values(alloc).reduce((s, a) => s + a.total, 0)
    const closed = new Set(projects.filter((p) => p.status === 'archivado' || p.status === 'cancelado').map((p) => p.id))
    const future = futureIncome(quotes, movements, closed)
    const visible = projects.filter((p) => !closed.has(p.id))
    const collection = projectCollection(visible, quotes, movements).filter((r) => r.budgetCents > 0 || r.collectedCents > 0)
    return { balances, cash, pending, alloc, debts, sumTotals, future, collection }
  }, [boxes, members, projects, generalExpenses, movements, quotes])

  if (!data) return <p className="text-sm text-muted-foreground">Cargando…</p>

  const name = (k: string) => (k === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (members!.find((m) => m.email === k)?.name ?? k))
  const projectTitle = (id: string) => projects!.find((p) => p.id === id)?.title ?? id
  const rows = Object.entries(data.alloc).sort(([a], [b]) => (a === WORKSHOP_SHARE_KEY ? 1 : b === WORKSHOP_SHARE_KEY ? -1 : 0))
  const squares = data.sumTotals === data.cash - data.pending

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Dinero en cajas" value={money(data.cash)} />
        <Kpi label="Gastos pendientes de pago" value={money(data.pending)} tone={data.pending > 0 ? 'warning' : undefined} />
        <Kpi label="El taller debe a socios" value={money(data.debts)} tone={data.debts > 0 ? 'warning' : undefined} />
        <Kpi
          label="Disponible real"
          hint="Cajas − pendientes − deudas con socios"
          value={money(data.cash - data.pending - data.debts)}
          strong
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Por cobrar de presupuestos aceptados" value={money(data.future.acceptedCents)} />
        <Kpi label="Presupuestos enviados (sin respuesta)" value={money(data.future.sentCents)} />
      </div>

      <Card>
        <h2 className="mb-1 font-semibold">Lo que le corresponde a cada uno</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ganancia de proyectos (cobros − gastos, incluidos los pendientes) según la participación − gastos generales según su
          reparto + aportes − retiros + lo que el taller le debe.
        </p>
        <div className="overflow-x-auto">
          <table aria-label="Reparto por socio" className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 font-medium">Socio</th>
                <th className="px-2 text-right font-medium">Proyectos</th>
                <th className="px-2 text-right font-medium">Gastos generales</th>
                <th className="px-2 text-right font-medium">Aportes</th>
                <th className="px-2 text-right font-medium">Retiros</th>
                <th className="px-2 text-right font-medium">Le debe el taller</th>
                <th className="pl-2 text-right font-medium">Le corresponde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {rows.map(([k, a]) => (
                <tr key={k}>
                  <th scope="row" className="py-2 pr-2 text-left font-medium">
                    {name(k)}
                  </th>
                  <Cell v={a.projects} />
                  <Cell v={-a.general} />
                  <Cell v={a.aportes} />
                  <Cell v={-a.retiros} />
                  <Cell v={a.debt} />
                  <td className={cn('pl-2 text-right font-semibold', a.total < 0 && 'text-destructive')}>{money(a.total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          role="status"
          className={cn('mt-3 flex items-center gap-2 text-xs', squares ? 'text-muted-foreground' : 'text-destructive')}
        >
          {squares ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4" />}
          Suma de todos: {money(data.sumTotals)} = cajas {money(data.cash)} − pendientes {money(data.pending)}
          {!squares && ' (no cuadra: hay movimientos o proyectos que no se pudieron leer; revisá los avisos)'}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Cobro por proyecto</h2>
        {data.collection.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay cobros ni presupuestos aceptados. Los presupuestos se cargan desde la sección Presupuestos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Cobro por proyecto" className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2 font-medium">Proyecto</th>
                  <th className="px-2 text-right font-medium">Presupuesto</th>
                  <th className="px-2 text-right font-medium">Cobrado</th>
                  <th className="px-2 text-right font-medium">Falta cobrar</th>
                  <th className="pl-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {data.collection.map((r) => (
                  <tr key={r.projectId}>
                    <th scope="row" className="py-2 pr-2 text-left font-medium">
                      <Link to={`/proyectos/${r.projectId}`} className="hover:underline">
                        {projectTitle(r.projectId)}
                      </Link>
                      {r.budgetCents > 0 && !r.accepted && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(enviado)</span>
                      )}
                    </th>
                    <td className="px-2 text-right">{r.budgetCents > 0 ? money(r.budgetCents) : '—'}</td>
                    <td className="px-2 text-right">{money(r.collectedCents)}</td>
                    <td className="px-2 text-right">{r.budgetCents > 0 ? money(r.pendingCents) : '—'}</td>
                    <td className="pl-2 text-right">{r.budgetCents > 0 ? `${r.percent.toLocaleString('es-ES')} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Saldo por caja</h2>
        <ul aria-label="Saldo por caja" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {boxes!.map((b) => (
            <li key={b.id} className={cn(!b.active && 'opacity-60')}>
              {b.name}: <span className="font-medium tabular-nums">{money(data.balances[b.id])}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  tone,
  strong,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'warning'
  strong?: boolean
}) {
  return (
    <Card className={cn(strong && 'border-primary/40 bg-primary/5')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'warning' && 'text-amber-600 dark:text-amber-400')}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

function Cell({ v: raw }: { v: number }) {
  const v = raw === 0 ? 0 : raw // evita "-0,00 €" al negar un 0
  return <td className={cn('px-2 text-right', v < 0 && 'text-destructive', v === 0 && 'text-muted-foreground')}>{formatEuros(v)}</td>
}
