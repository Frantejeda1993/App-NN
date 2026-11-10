import { ClipboardCopy, ExternalLink, ReceiptText, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/form'
import { formatEuros } from '@/domain/money'
import { formatQty, orderText, type ShoppingList } from '@/domain/shopping'
import { notifyError } from '@/lib/notify'
import { safeHref } from '@/lib/utils'

/**
 * Lista de compras del presupuesto aceptado: por proveedor, con "comprado"
 * compartido entre socios, pedido para copiar y registro del gasto.
 */
export function ShoppingListCard({
  list,
  title,
  projectId,
  purchased,
  onTogglePurchased,
}: {
  list: ShoppingList
  title: string
  projectId: string | null
  purchased: string[]
  onTogglePurchased: (key: string, bought: boolean) => void
}) {
  const bought = new Set(purchased)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Pedido copiado: pegalo en WhatsApp o en un email')
    } catch (e) {
      notifyError(e)
    }
  }
  const expenseLink = (supplier: string, cents: number) =>
    `/billetera/nuevo?${new URLSearchParams({
      tipo: 'gasto_proyecto',
      proyecto: projectId ?? '',
      importe: String(cents),
      concepto: `Compra de materiales – ${supplier}`,
      volver: 'proyecto',
    })}`

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <ShoppingCart className="size-4" aria-hidden /> Lista de compras
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">Solo lo aceptado. Las placas son enteras, igual que en el presupuesto.</p>

      {list.groups.length === 0 && list.manualCents === 0 ? (
        <p className="text-sm text-muted-foreground">No hay materiales ni herrajes del catálogo para comprar.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.groups.map((g) => {
            const done = g.lines.filter((l) => bought.has(l.key)).length
            return (
              <section key={g.supplier} aria-label={`Proveedor ${g.supplier}`} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {g.supplier}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      · {done}/{g.lines.length} comprado{g.lines.length === 1 ? '' : 's'}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-sm font-medium tabular-nums">{formatEuros(g.totalCents)}</span>
                    <Button size="sm" variant="outline" onClick={() => copy(orderText(g, title))}>
                      <ClipboardCopy /> Copiar pedido
                    </Button>
                    {projectId && (
                      <Link to={expenseLink(g.supplier, g.totalCents)} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                        <ReceiptText /> Registrar gasto
                      </Link>
                    )}
                  </div>
                </div>
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {g.lines.map((l) => {
                    const isBought = bought.has(l.key)
                    return (
                      <li key={l.key} className="flex items-center justify-between gap-2 py-1.5">
                        <label className="flex min-w-0 items-center gap-2">
                          <input type="checkbox" checked={isBought} onChange={(e) => onTogglePurchased(l.key, e.target.checked)} />
                          <span className={isBought ? 'truncate text-muted-foreground line-through' : 'truncate'}>{l.name}</span>
                          {safeHref(l.url) && (
                            <a href={safeHref(l.url)} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${l.name} en la web`} className="text-muted-foreground hover:text-primary">
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </label>
                        <span className="flex shrink-0 gap-3 tabular-nums">
                          <span>{formatQty(l)}</span>
                          <span className="w-20 text-right text-muted-foreground">{formatEuros(l.totalCents)}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {list.manualCents > 0 && (
            <p className="text-sm text-muted-foreground">
              Además, herrajes cargados a mano (sin artículo del catálogo): {formatEuros(list.manualCents)}.
            </p>
          )}
          <p className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Total a comprar</span>
            <span className="tabular-nums">{formatEuros(list.totalCents)}</span>
          </p>
          {!projectId && <p className="text-xs text-muted-foreground">Vinculá el presupuesto a un proyecto para registrar los gastos.</p>}
        </div>
      )}
    </Card>
  )
}
