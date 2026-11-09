import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/form'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useGeneralExpenses, useMovements } from '@/data/hooks'
import { memberDebts } from '@/domain/wallet'
import { notifyError, notifyWrite } from '@/lib/notify'
import { MOVEMENT_TYPES, type MovementType } from '@/model'
import { MovementForm } from './MovementForm'
import { useWalletNames } from './useWalletNames'

export function MovementNewPage() {
  const api = useData()
  const me = useMyEmail()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const names = useWalletNames()
  const movements = useMovements()
  const generalExpenses = useGeneralExpenses()
  const debts = useMemo(() => memberDebts(movements ?? []), [movements])

  const typeParam = params.get('tipo') as MovementType | null
  const projectParam = params.get('proyecto') ?? ''
  const expenseParam = params.get('gasto') ?? ''
  // Precarga desde la lista de compras: importe en céntimos (entero acotado) y concepto (texto, acotado).
  const amountParam = Number(params.get('importe'))
  const prefillAmount = Number.isSafeInteger(amountParam) && amountParam > 0 && amountParam <= 100_000_000 ? amountParam : undefined
  const prefillDescription = (params.get('concepto') ?? '').trim().slice(0, 200) || undefined

  if (names.loading || !movements || !generalExpenses) return <p className="text-sm text-muted-foreground">Cargando…</p>
  // Solo se usan ids que existen (nunca el texto crudo de la URL).
  const projectId = names.projects!.some((p) => p.id === projectParam) ? projectParam : ''
  const expense = generalExpenses.find((g) => g.id === expenseParam && g.active)
  const type: MovementType =
    typeParam === 'gasto_general' ? (expense || generalExpenses.some((g) => g.active) ? 'gasto_general' : 'cobro')
    : typeParam && MOVEMENT_TYPES.includes(typeParam) ? typeParam
    : 'cobro'
  const back =
    params.get('volver') === 'proyecto' && projectId
      ? `/proyectos/${encodeURIComponent(projectId)}`
      : type === 'gasto_general'
        ? '/billetera?tab=gastos'
        : '/billetera?tab=movimientos'
  // Pago de un gasto general: arranca con su importe habitual, categoría y nombre.
  const initial = expense
    ? {
        type,
        generalExpenseId: expense.id,
        amountCents: expense.amountCents,
        category: expense.category,
        description: expense.name,
      }
    : { type, projectId: projectId || null, amountCents: prefillAmount, description: prefillDescription }

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Link to={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo movimiento</h1>
      {names.boxes!.filter((b) => b.active).length === 0 ? (
        <Card className="text-sm">
          Primero creá una caja (Efectivo, Banco…).{' '}
          <Link to="/billetera?tab=cajas" className="text-primary underline">
            Ir a cajas
          </Link>
        </Card>
      ) : (
        <Card>
          <MovementForm
            boxes={names.boxes!}
            members={names.members!}
            projects={names.projects!}
            debts={debts}
            generalExpenses={generalExpenses}
            initial={initial}
            submitLabel="Registrar movimiento"
            onCancel={() => navigate(back)}
            onSubmit={(data) => {
              try {
                notifyWrite(api.createMovement(data, me), 'Movimiento registrado')
                navigate(back, { replace: true })
                return true
              } catch (e) {
                notifyError(e)
                return false
              }
            }}
          />
        </Card>
      )}
    </section>
  )
}
