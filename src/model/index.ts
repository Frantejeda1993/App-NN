export * from './common'
export * from './core'
export * from './wallet'
export * from './catalog'
export * from './quotes'
export * from './audit'

/** Nombres de colecciones (deben coincidir con firestore.rules). */
export const COLLECTIONS = {
  members: 'members',
  settings: 'settings',
  clients: 'clients',
  contacts: 'contacts', // subcolección de clients/{id}
  projects: 'projects',
  boxes: 'boxes',
  movements: 'movements',
  generalExpenses: 'generalExpenses',
  materials: 'catalogMaterials',
  edgeBanding: 'catalogEdgeBanding',
  hardware: 'catalogHardware',
  templates: 'templates',
  quotes: 'quotes',
  auditLog: 'auditLog',
  userPrefs: 'userPrefs',
} as const

/** Documentos de settings/. */
export const SETTINGS_DOCS = { workshop: 'workshop', services: 'services' } as const
