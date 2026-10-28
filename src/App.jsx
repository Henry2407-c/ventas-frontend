import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import Tienda from './pages/Tienda'
import Login from './pages/Login'
import PanelLayout from './pages/panel/PanelLayout'
import Dashboard from './pages/panel/Dashboard'
import Pedidos from './pages/panel/Pedidos'
import Productos from './pages/panel/Productos'
import POS from './pages/panel/POS'
import Ventas from './pages/panel/Ventas'
import Caja from './pages/panel/Caja'
import Clientes from './pages/panel/Clientes'
import Compras from './pages/panel/Compras'
import Usuarios from './pages/panel/Usuarios'

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) {
    return <div className="bg-aurora grid min-h-dvh place-items-center"><Loader2 className="size-8 animate-spin text-cyan-300" /></div>
  }
  return user ? children : <Navigate to="/ingresar" replace />
}

function RoleGate({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user.rol) ? children : <Navigate to="/panel" replace />
}

const G = (roles, el) => <RoleGate roles={roles}>{el}</RoleGate>

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Tienda />} />
      <Route path="/ingresar" element={<Login />} />
      <Route path="/panel" element={<Protected><PanelLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="vender" element={G(['admin', 'vendedor'], <POS />)} />
        <Route path="ventas" element={G(['admin', 'vendedor', 'contador'], <Ventas />)} />
        <Route path="caja" element={G(['admin', 'vendedor', 'contador'], <Caja />)} />
        <Route path="pedidos" element={G(['admin', 'vendedor'], <Pedidos />)} />
        <Route path="productos" element={G(['admin', 'vendedor', 'almacenero'], <Productos />)} />
        <Route path="compras" element={G(['admin', 'almacenero', 'contador'], <Compras />)} />
        <Route path="clientes" element={G(['admin', 'vendedor', 'contador'], <Clientes />)} />
        <Route path="usuarios" element={G(['admin'], <Usuarios />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}