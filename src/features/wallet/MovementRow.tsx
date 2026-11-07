import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/form'
import type { Movement } from '@/data/api'
import { formatDateEs } from '@/domain/dates'
import { displaySign } from '@/domain/wallet'
import { cn } from '@/lib/utils'
import { Amount } from './Amount'
import { TYPE_LABELS } from './labels'

export function MovementRow({
  m,
  summary,
  amountCents,
}: {
  m: Movement
  summary: string
  /** Importe a mostrar (p. ej. la parte de un proyecto); por defecto el total. */
  amountCents?: number
}) {
  return (
    <li>
      <Link
        to={`/billetera/movimientos/${m.id}`}
        className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted', m.deleted && 'opacity-60')}
      >
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-medium', m.deleted && 'line-through')}>
            {TYPE_LABELS[m.type]}
            {m.description && <span className="font-normal text-muted-foreground"> · {m.description}</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateEs(m.date)}
            {summary && ` · ${summary}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {m.status === 'pendiente_pago' && <Badge tone="warning">Pendiente de pago</Badge>}
          {m.deleted && <Badge tone="muted">Eliminado</Badge>}
          <Amount cents={amountCents ?? m.amountCents} sign={displaySign(m)} className={cn(m.deleted && 'line-through')} />
        </div>
      </Link>
    </li>
  )
}
