import { useMemo } from 'react'
import type { Movement } from '@/data/api'
import { useBoxes, useGeneralExpenses, useMembers, useProjects } from '@/data/hooks'
import { TYPE_LABELS } from './labels'

/** Resuelve ids/emails a nombres legibles para listas e historial. */
export function useWalletNames() {
  const boxes = useBoxes()
  const members = useMembers()
  const projects = useProjects()
  const generalExpenses = useGeneralExpenses()

  return useMemo(() => {
    const expense = new Map((generalExpenses ?? []).map((g) => [g.id, g.name]))
    const box = new Map((boxes ?? []).map((b) => [b.id, b.name]))
    const member = new Map((members ?? []).map((m) => [m.email, m.name]))
    const project = new Map((projects ?? []).map((p) => [p.id, p.title]))
    const boxName = (id: string | null) => (id ? (box.get(id) ?? 'Caja eliminada') : '')
    const memberName = (email: string | null) => (email ? (member.get(email) ?? email) : '')
    const projectName = (id: string | null) => (id ? (project.get(id) ?? 'Proyecto desconocido') : '')

    /** Resumen en una línea: "Cocina · Efectivo", "Nacho · Banco", "Efectivo → Banco". */
    const summary = (m: Movement) => {
      const parts: string[] = []
      if (m.generalExpenseId) parts.push(expense.get(m.generalExpenseId) ?? 'Gasto general')
      if (m.projectId) parts.push(projectName(m.projectId))
      if (m.projectSplits.length > 0) parts.push(m.projectSplits.map((s) => projectName(s.projectId)).join(' + '))
      if (m.memberEmail) parts.push(memberName(m.memberEmail))
      if (m.type === 'transferencia') parts.push(`${boxName(m.boxId)} → ${boxName(m.toBoxId)}`)
      else if (m.boxId) parts.push(boxName(m.boxId))
      if (m.paidBy) parts.push(`pagó ${memberName(m.paidBy)}`)
      return parts.filter(Boolean).join(' · ')
    }

    return {
      boxes,
      members,
      projects,
      loading: !boxes || !members || !projects,
      boxName,
      memberName,
      projectName,
      summary,
      typeLabel: (m: Movement) => TYPE_LABELS[m.type],
    }
  }, [boxes, members, projects, generalExpenses])
}
