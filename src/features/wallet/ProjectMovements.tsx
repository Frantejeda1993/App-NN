import { Plus, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/form'
import { useMovements } from '@/data/hooks'
import { formatEuros } from '@/domain/money'
import { projectAmount, touchesProject } from '@/domain/wallet'
import { MovementRow } from './MovementRow'
import { useWalletNames } from './useWalletNames'

/** Cobros y gastos de un proyecto, con totales y estimado vs. real. */
export function ProjectMovements({ projectId, estimatedCostCents }: { projectId: string; estimatedCostCents: number | null }) {
  const movements = useMovements()
  const names = useWalletNames()
  const list = useMemo(
    () => (movements ?? []).filter((m) => !m.deleted && touchesProject(m, projectId)),
    [movements, projectId],
  )

  const totals = useMemo(() => {
    let cobrado = 0
    let gastado = 0
    let pendiente = 0
    for (const m of list) {
      const amt = projectAmount(m, projectId)
      if (m.type === 'cobro') cobrado += amt
      else if (m.type === 'gasto_proyecto') {
        if (m.status === 'pendiente_pago') pendiente += amt
        else gastado += amt
      }
    }
    return { cobrado, gastado, pendiente }
  }, [list, projectId])

  const link = (tipo: string) => `/billetera/nuevo?tipo=${tipo}&proyecto=${encodeURIComponent(projectId)}&volver=proyecto`
  const real = totals.gastado + totals.pendiente

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Wallet className="size-4" aria-hidden /> Cobros y gastos
        </h2>
        <div className="flex gap-2">
          <Link to={link('cobro')} className={buttonVariants({ size: 'sm' })}>
            <Plus /> Registrar cobro
          </Link>
          <Link to={link('gasto_proyecto')} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            <Plus /> Registrar gasto
          </Link>
        </div>
      </div>

      <dl aria-label="Totales del proyecto" className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Total label="Cobrado" cents={totals.cobrado} />
        <Total label="Gastado" cents={totals.gastado} />
        <Total label="Gastos pendientes" cents={totals.pendiente} />
        <div>
          <dt className="text-muted-foreground">Estimado vs. real</dt>
          <dd className="tabular-nums">
            {estimatedCostCents !== null ? (
              <span className={real > estimatedCostCents ? 'text-destructive' : ''}>
                {formatEuros(real)} / {formatEuros(estimatedCostCents)}
              </span>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {!movements || names.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cobros ni gastos en este proyecto.</p>
      ) : (
        <ul aria-label="Movimientos del proyecto" className="-mx-4 flex flex-col divide-y divide-border md:-mx-5">
          {list.map((m) => (
            <MovementRow key={m.id} m={m} summary={names.summary(m)} amountCents={projectAmount(m, projectId)} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function Total({ label, cents }: { label: string; cents: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{formatEuros(cents)}</dd>
    </div>
  )
}
