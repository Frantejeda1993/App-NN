import { Input } from '@/components/ui/form'
import type { Member } from '@/data/api'
import { WORKSHOP_SHARE_KEY, formatPercent } from '@/domain/percent'
import { parsePercentInputs } from '@/domain/projects'
import { cn } from '@/lib/utils'
import { WORKSHOP_LABEL } from './labels'

/**
 * Editor de participación: una fila por socio activo (y por cualquier socio que
 * ya figure en el reparto) más el taller. Muestra el total en vivo.
 */
export function SharesEditor({
  members,
  value,
  onChange,
  idPrefix = 'share',
}: {
  members: Member[]
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  idPrefix?: string
}) {
  const names = new Map(members.map((m) => [m.email, m.name]))
  const keys = [
    ...new Set([
      ...members.filter((m) => m.active).map((m) => m.email),
      ...Object.keys(value).filter((k) => k !== WORKSHOP_SHARE_KEY),
    ]),
    WORKSHOP_SHARE_KEY,
  ]
  const full = Object.fromEntries(keys.map((k) => [k, value[k] ?? '']))
  const parsed = parsePercentInputs(full)

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Participación en la ganancia</legend>
      {keys.map((k, i) => {
        const id = `${idPrefix}-${i}`
        const label = k === WORKSHOP_SHARE_KEY ? WORKSHOP_LABEL : (names.get(k) ?? k)
        const inactive = k !== WORKSHOP_SHARE_KEY && !members.find((m) => m.email === k)?.active
        return (
          <div key={k} className="flex items-center justify-between gap-3">
            <label htmlFor={id} className="text-sm">
              {label}
              {inactive && <span className="ml-1 text-xs text-muted-foreground">(inactivo)</span>}
            </label>
            <div className="flex items-center gap-1">
              <Input
                id={id}
                inputMode="decimal"
                className="w-24 text-right"
                value={full[k]}
                placeholder="0"
                onChange={(e) => onChange({ ...full, [k]: e.target.value })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        )
      })}
      <p
        role="status"
        aria-live="polite"
        className={cn('mt-1 text-right text-sm font-medium', parsed.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}
      >
        {parsed.ok ? `Total ${formatPercent(parsed.totalBp)}` : parsed.error}
      </p>
    </fieldset>
  )
}
