import { useState, useEffect } from 'react'
import { apiFetch, formatNaira } from './api'
import HeaderUserMenu from './HeaderUserMenu'
import NotificationBell from './NotificationBell'

function todayLabel() {
  return new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Persistent strip above every dashboard page. Also the single home for the
// profile/logout menu, top-right, on every breakpoint — the sidebar no
// longer carries its own logout control.
function DashboardTopbar({ token, role, onLogout }) {
  const [price, setPrice] = useState(null)
  const [deliveryFee, setDeliveryFee] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiFetch('/price')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (data.price_per_kg !== undefined && data.price_per_kg !== null) setPrice(Number(data.price_per_kg))
        if (data.delivery_fee !== undefined && data.delivery_fee !== null) setDeliveryFee(Number(data.delivery_fee))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!token) return null

  return (
    <header className="sticky top-0 z-30 flex h-[52px] flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white/85 px-4 backdrop-blur sm:px-6 md:px-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="eyebrow hidden sm:inline">{todayLabel()}</span>
        {price !== null ? (
          <span className="figure inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" aria-hidden="true" />
            {formatNaira(price)} / kg
          </span>
        ) : (
          <span className="skeleton hidden h-6 w-24 sm:inline-block" />
        )}
        {deliveryFee !== null && (
          <span className="figure hidden items-center gap-1.5 rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-semibold text-brand-accent sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" aria-hidden="true" />
            {formatNaira(deliveryFee)} delivery
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <NotificationBell token={token} />
        <HeaderUserMenu token={token} role={role} onLogout={onLogout} />
      </div>
    </header>
  )
}

export default DashboardTopbar
