import { useMemo } from 'react'
import type { DataApi, Project, SettingsState } from '@/data/api'
import { useEdgeBanding, useHardware, useMaterials, useServiceRates } from '@/data/hooks'
import { todayIso } from '@/domain/dates'
import type { RatesLike } from '@/domain/quote'
import type { ShoppingCatalog } from '@/domain/shopping'
import { newQuoteInput } from '@/domain/quoteLifecycle'
import type { CatalogRefs } from '@/features/furniture/FurnitureItemEditor'
import { notifyWrite } from '@/lib/notify'
import type { QuoteStatus } from '@/model'

export const QUOTE_TONES: Record<QuoteStatus, 'default' | 'warning' | 'danger' | 'muted'> = {
  borrador: 'muted',
  enviado: 'warning',
  aceptado: 'default',
  aceptado_parcial: 'default',
  rechazado: 'danger',
  vencido: 'danger',
  finalizado: 'muted',
  archivado: 'muted',
}

export const QUOTE_GROUPS = ['abiertos', 'aceptados', 'cerrados', 'archivados', 'todos'] as const
export type QuoteGroup = (typeof QUOTE_GROUPS)[number]

export const QUOTE_GROUP_LABELS: Record<QuoteGroup, string> = {
  abiertos: 'Abiertos',
  aceptados: 'Aceptados',
  cerrados: 'Rechazados / vencidos',
  archivados: 'Archivados',
  todos: 'Todos',
}

const GROUP_STATUSES: Record<Exclude<QuoteGroup, 'todos'>, QuoteStatus[]> = {
  abiertos: ['borrador', 'enviado'],
  aceptados: ['aceptado', 'aceptado_parcial', 'finalizado'],
  cerrados: ['rechazado', 'vencido'],
  archivados: ['archivado'],
}

export const inQuoteGroup = (status: QuoteStatus, g: QuoteGroup) => g === 'todos' || GROUP_STATUSES[g].includes(status)

/** Catálogo (listas para los selectores + mapas para el cálculo) y tarifas. */
export function useQuoteCatalog(): { refs: CatalogRefs; maps: ShoppingCatalog; rates: RatesLike } | undefined {
  const materials = useMaterials()
  const hardware = useHardware()
  const edgeBanding = useEdgeBanding()
  const services = useServiceRates()
  return useMemo(() => {
    if (!materials || !hardware || !edgeBanding || !services) return undefined
    return {
      refs: { materials, hardware, edgeBanding },
      maps: {
        materials: new Map(materials.map((m) => [m.id, m])),
        hardware: new Map(hardware.map((h) => [h.id, h])),
        edgeBanding: new Map(edgeBanding.map((e) => [e.id, e])),
      },
      rates: services.rates,
    }
  }, [materials, hardware, edgeBanding, services])
}

/** Crea un presupuesto en borrador (suelto o de un proyecto) y devuelve su id. */
export function startQuote(api: DataApi, me: string, project: Project | null, settings: SettingsState['settings']): string {
  const res = api.createQuote(newQuoteInput({ project, settings, today: todayIso() }), me)
  notifyWrite(res, 'Presupuesto creado')
  return res.id
}
