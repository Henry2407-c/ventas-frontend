import { useAuth } from '../../context/AuthContext'
import AdminDashboard from './AdminDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function Dashboard() {
  const { can } = useAuth()
  return can('admin', 'contador') ? <AdminDashboard /> : <EmployeeDashboard />
}