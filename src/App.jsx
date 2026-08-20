import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SESSION_DURATION_MS } from './api'
import Sidebar from './Sidebar'
import DashboardTopbar from './DashboardTopbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import UploadCylinderImage from './pages/UploadCylinderImage'
import CreateOrder from './pages/CreateOrder'
import MyOrders from './pages/MyOrders'
import OrderDetail from './pages/OrderDetail'
import PaymentCallback from './pages/PaymentCallback'
import AdminDashboard from './pages/AdminDashboard'
import AdminPayments from './pages/AdminPayments'
import AdminReports from './pages/AdminReports'
import AdminSettings from './pages/AdminSettings'
import AdminUsers from './pages/AdminUsers'
import AdminStudents from './pages/AdminStudents'
import AdminStudentDetail from './pages/AdminStudentDetail'
import AdminStaff from './pages/AdminStaff'
import AdminPermissions from './pages/AdminPermissions'
import AdminUserTypes from './pages/AdminUserTypes'
import AdminHostels from './pages/AdminHostels'
import Profile from './pages/Profile'
import AdminProfile from './pages/AdminProfile'
import Landing from './pages/Landing'

function readPermissions() {
  try {
    return JSON.parse(localStorage.getItem('permissions') || '[]')
  } catch {
    return []
  }
}

// Priority order for where an admin/employee lands after login — the first
// area they actually have permission for.
const HOME_PRIORITY = [
  ['manage_orders', '/admin'],
  ['manage_payments', '/admin/payments'],
  ['manage_reports', '/admin/reports'],
  ['manage_students', '/admin/students'],
  ['manage_settings', '/admin/settings'],
]

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [role, setRole] = useState(() => localStorage.getItem('role'))
  const [permissions, setPermissionsState] = useState(readPermissions)

  const setPermissions = (next) => {
    setPermissionsState(next || [])
    localStorage.setItem('permissions', JSON.stringify(next || []))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('permissions')
    localStorage.removeItem('loginAt')
    setToken(null)
    setRole(null)
    setPermissionsState([])
  }

  // Auto-logout 3 hours after login — mirrors the backend's Sanctum token
  // expiration (config/sanctum.php) so the UI doesn't sit on stale state
  // waiting for the next API call to 401. Also catches the 401 directly, in
  // case the tab was open across the expiry and a request lands first.
  useEffect(() => {
    if (!token) return undefined

    const checkExpiry = () => {
      const loginAt = Number(localStorage.getItem('loginAt'))
      if (loginAt && Date.now() - loginAt >= SESSION_DURATION_MS) {
        handleLogout()
      }
    }

    checkExpiry()
    const intervalId = setInterval(checkExpiry, 60 * 1000)
    window.addEventListener('auth:unauthorized', handleLogout)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('auth:unauthorized', handleLogout)
    }
  }, [token])

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || isSuperAdmin
  const can = (key) => isSuperAdmin || permissions.includes(key)

  const adminHome = HOME_PRIORITY.find(([key]) => can(key))?.[1] || '/admin/profile'
  const homePath = isAdmin ? adminHome : '/orders'

  const adminRoute = (permissionKey, element) =>
    !token ? (
      <Navigate to="/login" />
    ) : !isAdmin ? (
      <Navigate to="/orders" />
    ) : !can(permissionKey) ? (
      <Navigate to={homePath} />
    ) : (
      element
    )

  const superAdminRoute = (element) =>
    !token ? <Navigate to="/login" /> : !isSuperAdmin ? <Navigate to={isAdmin ? homePath : '/orders'} /> : element

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-brand-bg md:flex-row">
        <Sidebar token={token} role={role} permissions={permissions} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar token={token} role={role} onLogout={handleLogout} />
          <main className="flex-1 p-4 sm:p-6 md:p-10">
          <Routes>
            <Route
              path="/"
              element={token ? <Navigate to={homePath} /> : <Landing />}
            />
            <Route
              path="/login"
              element={
                token ? (
                  <Navigate to={homePath} />
                ) : (
                  <Login setToken={setToken} setRole={setRole} setPermissions={setPermissions} />
                )
              }
            />
            <Route
              path="/register"
              element={
                token ? (
                  <Navigate to={homePath} />
                ) : (
                  <Register setToken={setToken} setRole={setRole} setPermissions={setPermissions} />
                )
              }
            />
            <Route
              path="/forgot-password"
              element={token ? <Navigate to={homePath} /> : <ForgotPassword />}
            />
            <Route
              path="/upload-cylinder-image"
              element={
                !token ? <Navigate to="/login" /> : isAdmin ? <Navigate to={homePath} /> : <UploadCylinderImage token={token} />
              }
            />
            <Route
              path="/create-order"
              element={
                !token ? <Navigate to="/login" /> : isAdmin ? <Navigate to={homePath} /> : <CreateOrder token={token} />
              }
            />
            <Route
              path="/orders"
              element={
                !token ? <Navigate to="/login" /> : isAdmin ? <Navigate to={homePath} /> : <MyOrders token={token} />
              }
            />
            <Route
              path="/orders/:id"
              element={
                !token ? <Navigate to="/login" /> : isAdmin ? <Navigate to={homePath} /> : <OrderDetail token={token} />
              }
            />
            <Route
              path="/payment/callback"
              element={!token ? <Navigate to="/login" /> : <PaymentCallback token={token} />}
            />
            <Route
              path="/profile"
              element={
                !token ? <Navigate to="/login" /> : isAdmin ? <Navigate to={homePath} /> : <Profile token={token} />
              }
            />
            <Route path="/admin" element={adminRoute('manage_orders', <AdminDashboard token={token} />)} />
            <Route path="/admin/payments" element={adminRoute('manage_payments', <AdminPayments token={token} />)} />
            <Route path="/admin/reports" element={adminRoute('manage_reports', <AdminReports token={token} />)} />
            <Route path="/admin/students" element={adminRoute('manage_students', <AdminStudents token={token} />)} />
            <Route path="/admin/students/:id" element={adminRoute('manage_students', <AdminStudentDetail token={token} />)} />
            <Route
              path="/admin/users"
              element={adminRoute('manage_students', <AdminUsers token={token} isSuperAdmin={isSuperAdmin} />)}
            />
            <Route path="/admin/settings" element={adminRoute('manage_settings', <AdminSettings token={token} />)} />
            <Route path="/admin/staff" element={superAdminRoute(<AdminStaff token={token} />)} />
            <Route path="/admin/permissions" element={superAdminRoute(<AdminPermissions token={token} />)} />
            <Route path="/admin/user-types" element={superAdminRoute(<AdminUserTypes token={token} />)} />
            <Route path="/admin/hostels" element={superAdminRoute(<AdminHostels token={token} />)} />
            <Route
              path="/admin/profile"
              element={
                !token ? <Navigate to="/login" /> : !isAdmin ? <Navigate to="/orders" /> : <AdminProfile token={token} />
              }
            />
            <Route path="*" element={<Navigate to={token ? homePath : '/login'} />} />
          </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
