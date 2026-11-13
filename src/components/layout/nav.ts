import { FileText, FolderKanban, Home, Package, Users, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** Rótulo para la barra inferior del celular (si el completo no entra). */
  short?: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/billetera', label: 'Billetera', icon: Wallet },
  { to: '/presupuestos', label: 'Presupuestos', short: 'Presup.', icon: FileText },
  { to: '/catalogo', label: 'Catálogo', icon: Package },
]
