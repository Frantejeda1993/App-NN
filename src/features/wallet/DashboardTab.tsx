import { AlertTriangle, CheckCircle2, HandCoins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/form'
import { formatEuros } from '@/domain/money'
import { WORKSHOP_SHARE_KEY } from '@/domain/percent'
import { WORKSHOP_LABEL } from '@/features/projects/labels'
import { cn } from '@/lib/utils'
import { useWalletTotals } from './useWalletTotals'
import { Loading } from '@/components/ui/loading'

const money = (c: number) => formatEuros(c)

export function DashboardTab() {
  const data = useWalletTotals()
  if (!data) return <Loading />

  const name = (k: string) => (k === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (data.members.find((m) => m.email === k)?.name ?? k))
  const projectTitle = (id: string) => data.projects.find((p) => p.id === id)?.title ?? id
  const rows = Object.entries(data.alloc).sort(([a], [b]) => (a === WORKSHOP_SHARE_KEY ? 1 : b === WORKSHOP_SHARE_KEY ? -1 : 0))
  const squares = data.sumTotals === data.cash - data.pending

  return (
    <div className="flex flex-col gap-4">
      {!data.openingExists && (
        <Card className="text-sm">
          ¿Ya tenían dinero y cuentas antes de empezar a usar la app?{' '}
          <Link to="/billetera?tab=inicial" className="text-primary underline">
            Cargá la configuración inicial
          </Link>{' '}
          para que los saldos arranquen desde ahí.
        </Card>
      )}

      {/* Dos por fila ya en el celular: los importes entran y se evita tanto desplazamiento. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Por cobrar de presupuestos aceptados" value={money(data.future.acceptedCents)} />
        <Kpi label="Presupuestos enviados (sin respuesta)" value={money(data.future.sentCents)} />
        <Card>
          <p className="text-xs text-muted-foreground">Fondo común del taller</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{money(data.fund)}</p>
          {data.fund > 0 && (
            <Link to="/billetera/nuevo?tipo=reparto" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-2')}>
              <HandCoins /> Repartir entre socios
            </Link>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 font-semibold">Lo que le corresponde a cada uno</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Saldo inicial + ganancia de proyectos (cobros − gastos, incluidos los pendientes) según la participación − gastos
          generales según su reparto + aportes − retiros + lo que el taller le debe + lo repartido del fondo del taller.
        </p>
        <div className="overflow-x-auto">
          <table aria-label="Reparto por socio" className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 font-medium">Socio</th>
                <th className="px-2 text-right font-medium">Proyectos</th>
                <th className="px-2 text-right font-medium">Gastos generales</th>
                <th className="px-2 text-right font-medium">Aportes</th>
                <th className="px-2 text-right font-medium">Retiros</th>
                <th className="px-2 text-right font-medium">Le debe el taller</th>
                <th className="px-2 text-right font-medium">Fondo del taller</th>
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
                  <Cell v={a.reparto} />
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
          {squares ? <CheckCircle2 className="size-4 text-success" /> : <AlertTriangle className="size-4" />}
          Suma de todos: {money(data.sumTotals)} = cajas {money(data.cash)} − pendientes {money(data.pending)}
          {!squares &&
            ' (no cuadra: revisá la configuración inicial o los avisos de movimientos/proyectos que no se pudieron leer)'}
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
          {data.boxes.map((b) => (
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
      <p className={cn('mt-1 text-lg font-semibold tabular-nums sm:text-xl', tone === 'warning' && 'text-warning')}>
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
