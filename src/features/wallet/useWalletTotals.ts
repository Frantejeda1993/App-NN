import { useMemo } from 'react'
import { useBoxes, useGeneralExpenses, useMembers, useMovements, useOpeningBalances, useProjects, useQuotes } from '@/data/hooks'
import {
  allocations,
  futureIncome,
  keptAcceptedIds,
  pendingExpenses,
  projectCollection,
  workshopFund,
} from '@/domain/dashboard'
import { WORKSHOP_SHARE_KEY } from '@/domain/percent'
import { boxBalances } from '@/domain/wallet'

/**
 * Totales de la billetera (saldos iniciales + movimientos) para el panel y el
 * reparto del fondo del taller. `null` mientras carga.
 */
export function useWalletTotals() {
  const boxes = useBoxes()
  const members = useMembers()
  const projects = useProjects()
  const generalExpenses = useGeneralExpenses()
  const movements = useMovements()
  const quotes = useQuotes()
  const opening = useOpeningBalances()

  return useMemo(() => {
    if (!boxes || !members || !projects || !generalExpenses || !movements || !quotes || !opening) return null
    const balances = boxBalances(movements, boxes.map((b) => b.id), opening.opening.boxes)
    const cash = Object.values(balances).reduce((s, v) => s + v, 0)
    const pending = pendingExpenses(movements)
    const alloc = allocations({
      members: members.filter((m) => m.active).map((m) => m.email),
      projects,
      generalExpenses,
      movements,
      quotes,
      opening: opening.opening.people,
    })
    const debts = Object.entries(alloc)
      .filter(([k]) => k !== WORKSHOP_SHARE_KEY)
      .reduce((s, [, a]) => s + Math.max(0, a.debt), 0)
    const sumTotals = Object.values(alloc).reduce((s, a) => s + a.total, 0)
    const closed = new Set(projects.filter((p) => p.status === 'archivado' || p.status === 'cancelado').map((p) => p.id))
    const future = futureIncome(quotes, movements, closed, keptAcceptedIds(projects))
    const visible = projects.filter((p) => !closed.has(p.id))
    const collection = projectCollection(visible, quotes, movements).filter((r) => r.budgetCents > 0 || r.collectedCents > 0)
    return {
      boxes,
      members,
      projects,
      balances,
      cash,
      pending,
      alloc,
      debts,
      sumTotals,
      future,
      collection,
      fund: workshopFund(alloc),
      openingExists: opening.exists,
    }
  }, [boxes, members, projects, generalExpenses, movements, quotes, opening])
}
