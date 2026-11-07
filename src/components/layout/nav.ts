import { FileText, FolderKanban, Home, Users, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/billetera', label: 'Billetera', icon: Wallet },
  { to: '/presupuestos', label: 'Presupuestos', icon: FileText },
]
