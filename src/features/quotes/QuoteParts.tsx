import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { MoneyInput } from '@/components/ui/money-input'
import { formatEuros } from '@/domain/money'
import type { ItemBreakdown, QuoteTotals } from '@/domain/quote'
import { formatPercent } from '@/domain/percent'
import { newLocalId } from '@/domain/quoteLifecycle'
import type { QuoteData } from '@/model'

/** Desglose de un mueble (materiales, corte, canto, herrajes, mano de obra…). */
export function Breakdown({ b }: { b: ItemBreakdown }) {
  const rows: [string, number][] = [
    ['Materiales (placas)', b.materialCents],
    ['Corte y canteado', b.cutCents],
    ['Canto', b.edgeCents],
    ['Herrajes', b.hardwareCents],
    [
      b.laborCents === b.laborSuggestedCents ? 'Mano de obra (sugerida)' : `Mano de obra (sugerida ${formatEuros(b.laborSuggestedCents)})`,
      b.laborCents,
    ],
    ['Complejidad', b.complexityCents],
  ]
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs">
      <dt className="text-muted-foreground">Superficie</dt>
      <dd className="text-right tabular-nums">{b.m2.toLocaleString('es-ES')} m²</dd>
      {rows.map(([label, cents]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right tabular-nums">{formatEuros(cents)}</dd>
        </div>
      ))}
      <dt className="font-medium">Calculado</dt>
      <dd className="text-right font-medium tabular-nums">{formatEuros(b.computedCents)}</dd>
      {b.totalCents !== b.computedCents && (
        <>
          <dt className="font-medium">Precio a mano</dt>
          <dd className="text-right font-medium tabular-nums">{formatEuros(b.totalCents)}</dd>
        </>
      )}
    </dl>
  )
}

/** Resumen: placas a comprar, subtotales, total, seña y aceptado. */
export function QuoteSummary({ totals, depositBp, partial }: { totals: QuoteTotals; depositBp: number; partial: boolean }) {
  const materials = totals.sheets.reduce((s, x) => s + x.costCents, 0)
  const row = (label: string, cents: number, strong = false) => (
    <div className={strong ? 'flex justify-between font-semibold' : 'flex justify-between'}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{formatEuros(cents)}</span>
    </div>
  )
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <h3 className="mb-1 font-semibold">Placas</h3>
        {totals.sheets.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ningún mueble tiene material asignado.</p>
        ) : (
          <ul aria-label="Placas por material" className="flex flex-col gap-0.5 text-xs">
            {totals.sheets.map((s) => (
              <li key={s.materialId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {s.name} · {s.m2WithWaste.toLocaleString('es-ES')} m² →{' '}
                  <strong>
                    {s.sheets} placa{s.sheets === 1 ? '' : 's'}
                  </strong>
                </span>
                <span className="tabular-nums">{formatEuros(s.costCents)}</span>
              </li>
            ))}
          </ul>
        )}
        {totals.multiplierRefCents > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Referencia: materiales {formatEuros(materials)} × multiplicador = {formatEuros(totals.multiplierRefCents)} (no cambia el total)
          </p>
        )}
      </div>
      <div className="flex flex-col gap-0.5 border-t border-border pt-2">
        {row('Muebles', totals.itemsCents)}
        {totals.freeLinesCents !== 0 && row('Líneas libres', totals.freeLinesCents)}
        {totals.adjustmentsCents !== 0 && row('Ajustes', totals.adjustmentsCents)}
        {totals.vatCents !== 0 && row('IVA', totals.vatCents)}
        {row('Total', totals.totalCents, true)}
        {depositBp > 0 && row(`Seña (${formatPercent(depositBp)})`, totals.depositCents)}
        {partial && row('Total aceptado', totals.acceptedTotalCents, true)}
      </div>
    </div>
  )
}

type FreeLine = QuoteData['freeLines'][number]
type Adjustment = QuoteData['adjustments'][number]

export function FreeLinesEditor({
  lines,
  onChange,
  readOnly,
  acceptable,
}: {
  lines: FreeLine[]
  onChange: (l: FreeLine[]) => void
  readOnly: boolean
  acceptable: boolean
}) {
  const set = (i: number, patch: Partial<FreeLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  return (
    <div className="flex flex-col gap-2">
      {lines.length === 0 && <p className="text-xs text-muted-foreground">Flete, colocación, diseño… lo que no es un mueble.</p>}
      {lines.map((l, i) => (
        <div key={l.id} className="grid grid-cols-[auto_1fr_8rem_auto] items-center gap-2">
          {acceptable ? (
            <input
              type="checkbox"
              aria-label={`Aceptada: ${l.description || 'línea'}`}
              checked={l.accepted}
              onChange={(e) => set(i, { accepted: e.target.checked })}
            />
          ) : (
            <span />
          )}
          <Input
            aria-label="Descripción"
            value={l.description}
            disabled={readOnly}
            onChange={(e) => set(i, { description: e.target.value })}
            placeholder="Descripción"
          />
          {readOnly ? (
            <span className="text-right tabular-nums">{formatEuros(l.amountCents)}</span>
          ) : (
            <MoneyInput id={`fl-${l.id}`} aria-label="Importe" cents={l.amountCents} onChange={(c) => set(i, { amountCents: c ?? 0 })} />
          )}
          {!readOnly ? (
            <Button size="icon" variant="ghost" aria-label="Quitar línea" onClick={() => onChange(lines.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {!readOnly && (
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...lines,
                {
                  id: newLocalId(),
                  description: '',
                  amountCents: 0,
                  accepted: true,
                },
              ])
            }
          >
            <Plus /> Línea libre
          </Button>
        </div>
      )}
    </div>
  )
}

export function AdjustmentsEditor({
  items,
  onChange,
  readOnly,
}: {
  items: Adjustment[]
  onChange: (a: Adjustment[]) => void
  readOnly: boolean
}) {
  const set = (i: number, patch: Partial<Adjustment>) => onChange(items.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Descuentos (negativos) o recargos, con su motivo.</p>}
      {items.map((a, i) => (
        <div key={a.id} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
          <Input
            aria-label="Motivo"
            value={a.reason}
            disabled={readOnly}
            onChange={(e) => set(i, { reason: e.target.value })}
            placeholder="Motivo"
          />
          {readOnly ? (
            <span className="text-right tabular-nums">{formatEuros(a.amountCents)}</span>
          ) : (
            <MoneyInput
              id={`adj-${a.id}`}
              aria-label="Importe del ajuste"
              allowNegative
              cents={a.amountCents}
              onChange={(c) => set(i, { amountCents: c ?? 0 })}
            />
          )}
          {!readOnly ? (
            <Button size="icon" variant="ghost" aria-label="Quitar ajuste" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {!readOnly && (
        <div>
          <Button size="sm" variant="outline" onClick={() => onChange([...items, { id: newLocalId(), reason: '', amountCents: 0 }])}>
            <Plus /> Ajuste
          </Button>
        </div>
      )}
    </div>
  )
}
