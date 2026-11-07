import { Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/form'
import { useGeneralExpenses, useMovements } from '@/data/hooks'
import { todayIso } from '@/domain/dates'
import { dueFixedExpenses } from '@/domain/generalExpenses'
import { formatEuros } from '@/domain/money'
import { payLink } from '@/features/wallet/generalExpenseLinks'

/** Recordatorio en Inicio: gastos fijos cuyo pago de este mes falta registrar. */
export function FixedExpensesDue() {
  const expenses = useGeneralExpenses()
  const movements = useMovements()
  if (!expenses || !movements) return null
  const due = dueFixedExpenses(expenses, movements, todayIso())
  if (due.length === 0) return null

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Receipt className="size-4 text-destructive" aria-hidden /> Gastos fijos por pagar este mes
      </h2>
      <ul aria-label="Gastos fijos por pagar este mes" className="flex flex-col gap-1">
        {due.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {g.name} · <span className="text-muted-foreground">{formatEuros(g.amountCents)} (vence el día {g.dayOfMonth})</span>
            </span>
            <Link to={payLink(g.id)} className={buttonVariants({ size: 'sm' })}>
              Registrar pago
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
