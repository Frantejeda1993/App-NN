import { formatEuros } from '@/domain/money'
import { cn } from '@/lib/utils'

/** Importe con signo y color: verde entra, rojo sale, neutro sin signo. */
export function Amount({ cents, sign, className }: { cents: number; sign: 1 | -1 | 0; className?: string }) {
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        sign > 0 && 'text-success',
        sign < 0 && 'text-destructive',
        className,
      )}
    >
      {sign > 0 ? '+' : sign < 0 ? '−' : ''}
      {formatEuros(cents)}
    </span>
  )
}
