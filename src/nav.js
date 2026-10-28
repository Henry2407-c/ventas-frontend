import { LayoutDashboard, Package, Receipt, ShoppingBag, ShoppingCart, Truck, UserCog, Users, Wallet } from 'lucide-react'

export const NAV = [
  { to: '/panel', label: 'Dashboard', short: 'Inicio', icon: LayoutDashboard, roles: ['admin', 'vendedor', 'almacenero', 'contador'], end: true },
  { to: '/panel/vender', label: 'Nueva venta', short: 'Vender', icon: ShoppingCart, roles: ['admin', 'vendedor'] },
  { to: '/panel/ventas', label: 'Ventas', short: 'Ventas', icon: Receipt, roles: ['admin', 'vendedor', 'contador'] },
  { to: '/panel/caja', label: 'Caja del día', short: 'Caja', icon: Wallet, roles: ['admin', 'vendedor', 'contador'] },
  { to: '/panel/pedidos', label: 'Pedidos web', short: 'Pedidos', icon: ShoppingBag, roles: ['admin', 'vendedor'] },
  { to: '/panel/productos', label: 'Productos', short: 'Productos', icon: Package, roles: ['admin', 'vendedor', 'almacenero'] },
  { to: '/panel/compras', label: 'Compras', short: 'Compras', icon: Truck, roles: ['admin', 'almacenero', 'contador'] },
  { to: '/panel/clientes', label: 'Clientes', short: 'Clientes', icon: Users, roles: ['admin', 'vendedor', 'contador'] },
  { to: '/panel/usuarios', label: 'Usuarios', short: 'Usuarios', icon: UserCog, roles: ['admin'] },
]