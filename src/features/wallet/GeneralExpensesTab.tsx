import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useGeneralExpenses, useMembers, useMovements } from '@/data/hooks'
import { todayIso } from '@/domain/dates'
import { fixedExpenseStatus } from '@/domain/generalExpenses'
import { formatEuros } from '@/domain/money'
import { WORKSHOP_SHARE_KEY, formatPercent } from '@/domain/percent'
import { WORKSHOP_LABEL } from '@/features/projects/labels'
import { notifyError, notifyWrite } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { GeneralExpenseDataSchema } from '@/model'
import { FIXED_STATUS_LABELS, payLink } from './generalExpenseLinks'
import { Loading } from '@/components/ui/loading'

export function GeneralExpensesTab() {
  const api = useData()
  const me = useMyEmail()
  const expenses = useGeneralExpenses()
  const movements = useMovements()
  const members = useMembers()
  const today = todayIso()

  const memberName = useMemo(() => {
    const map = new Map((members ?? []).map((m) => [m.email, m.name]))
    return (k: string) => (k === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (map.get(k) ?? k))
  }, [members])

  if (!expenses || !movements || !members) return <Loading />

  const fixed = expenses.filter((g) => g.kind === 'fijo')
  const sporadic = expenses.filter((g) => g.kind === 'esporadico')

  const toggle = (g: (typeof expenses)[number]) => {
    try {
      notifyWrite(
        api.updateGeneralExpense(g.id, GeneralExpenseDataSchema.parse({ ...g, active: !g.active }), me),
        g.active ? 'Gasto desactivado' : 'Gasto reactivado',
      )
    } catch (e) {
      notifyError(e)
    }
  }

  const list = (items: typeof expenses, label: string) => (
    <ul aria-label={label} className="flex flex-col divide-y divide-border">
      {items.map((g) => {
        const status = g.kind === 'fijo' && g.active ? fixedExpenseStatus(g, movements, today) : null
        return (
          <li key={g.id} className={cn('flex flex-wrap items-start justify-between gap-3 py-3', !g.active && 'opacity-60')}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {g.name}
                {status && <Badge tone={FIXED_STATUS_LABELS[status].tone}>{FIXED_STATUS_LABELS[status].label}</Badge>}
                {!g.active && <Badge tone="muted">Inactivo</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {g.category} · {formatEuros(g.amountCents)}
                {g.kind === 'fijo' && g.dayOfMonth && ` · vence el día ${g.dayOfMonth}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Reparto:{' '}
                {Object.entries(g.shares)
                  .filter(([, bp]) => bp > 0)
                  .map(([k, bp]) => `${memberName(k)} ${formatPercent(bp)}`)
                  .join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.active && (
                <Link to={payLink(g.id)} className={buttonVariants({ size: 'sm', variant: status === 'vence' ? 'default' : 'outline' })}>
                  Registrar pago
                </Link>
              )}
              <Link to={`/billetera/gastos/${g.id}`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                Editar
              </Link>
              <Button size="sm" variant="ghost" onClick={() => toggle(g)}>
                {g.active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link to="/billetera/gastos/nuevo?tipo=fijo" className={buttonVariants()}>
          <Plus /> Nuevo gasto fijo
        </Link>
        <Link to="/billetera/gastos/nuevo?tipo=esporadico" className={buttonVariants({ variant: 'outline' })}>
          <Plus /> Nuevo gasto esporádico
        </Link>
      </div>
      <Card>
        <h2 className="mb-1 font-semibold">Fijos (todos los meses)</h2>
        {fixed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Alquiler, luz, internet… Creá el primero.</p>
        ) : (
          list(fixed, 'Gastos fijos')
        )}
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">Esporádicos</h2>
        {sporadic.length === 0 ? (
          <p className="text-sm text-muted-foreground">Herramientas, insumos… Se registran cuando se compran.</p>
        ) : (
          list(sporadic, 'Gastos esporádicos')
        )}
      </Card>
    </div>
  )
}
