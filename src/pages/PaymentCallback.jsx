import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle, HelpCircle } from 'lucide-react'
import { apiFetch, formatNaira } from '../api'

// Paystack's redirect only carries a `reference` — it doesn't tell us
// whether the charge succeeded. Rather than waiting on the webhook (which
// requires Paystack's servers to reach ours — impossible in local dev, and
// not instant even in production), this page calls verify-payment, which
// has the backend ask Paystack directly and update the order synchronously.
function PaymentCallback({ token }) {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref') || ''
  const [phase, setPhase] = useState('checking') // checking | confirmed | failed | unknown
  const [order, setOrder] = useState(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const response = await apiFetch('/my-orders', { token })
        if (!response.ok) throw new Error()
        const data = await response.json()
        const orders = Array.isArray(data) ? data : data.orders || data.data || []

        const match = reference
          ? orders.find((o) => o.paystack_reference === reference)
          : [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

        if (!match) {
          if (!cancelled) setPhase('unknown')
          return
        }

        if (match.status !== 'pending') {
          if (!cancelled) {
            setOrder(match)
            setPhase('confirmed')
          }
          return
        }

        const verifyResponse = await apiFetch(`/orders/${match.id}/verify-payment`, { method: 'POST', token })
        const verifyData = await verifyResponse.json().catch(() => null)

        if (cancelled) return

        if (verifyResponse.ok && verifyData?.order && verifyData.order.status !== 'pending') {
          setOrder(verifyData.order)
          setPhase('confirmed')
          return
        }

        if (verifyResponse.ok && ['failed', 'abandoned'].includes(verifyData?.paystack_status)) {
          setOrder(match)
          setPhase('failed')
          return
        }

        setOrder(match)
        setPhase('unknown')
      } catch {
        if (!cancelled) setPhase('unknown')
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [token, reference])

  return (
    <div className="mx-auto max-w-md">
      <div className="panel-card p-8 pt-10 text-center">
        {phase === 'checking' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-teal" strokeWidth={1.8} />
            <h2 className="mt-4 font-heading text-xl font-bold text-brand-navy">Confirming your payment…</h2>
            <p className="mt-2 text-sm text-slate-500">This usually takes a few seconds.</p>
          </>
        )}

        {phase === 'confirmed' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" strokeWidth={1.6} />
            <h2 className="mt-4 font-heading text-xl font-bold text-brand-navy">Payment Successful 🎉</h2>
            <p className="mt-2 text-sm text-slate-500">Your gas refill order has been received.</p>

            {order && (
              <div className="mt-6 rounded-xl bg-brand-bg px-4 py-3 text-left text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Order</span>
                  <span className="figure font-medium text-brand-navy">#{order.id}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="figure font-medium text-brand-navy">{formatNaira(order.total_amount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Next step</span>
                  <span className="text-slate-700">We'll pick up your cylinder soon</span>
                </div>
              </div>
            )}

            <Link to={order ? `/orders/${order.id}` : '/orders'} className="btn-primary mt-6 w-full">
              Track This Order
            </Link>
          </>
        )}

        {phase === 'failed' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" strokeWidth={1.6} />
            <h2 className="mt-4 font-heading text-xl font-bold text-brand-navy">Payment Didn't Go Through</h2>
            <p className="mt-2 text-sm text-slate-500">
              Paystack reported this payment as failed or abandoned. No charge was completed — you can retry from My Orders.
            </p>
            <Link to={order ? `/orders/${order.id}` : '/orders'} className="btn-primary mt-6 w-full">
              Retry Payment
            </Link>
          </>
        )}

        {phase === 'unknown' && (
          <>
            <HelpCircle className="mx-auto h-12 w-12 text-slate-300" strokeWidth={1.6} />
            <h2 className="mt-4 font-heading text-xl font-bold text-brand-navy">We couldn't confirm this automatically</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your payment may still have gone through. Check My Orders — if it still shows as pending, you can retry payment from there.
            </p>
            <Link to="/orders" className="btn-outline mt-6 w-full">
              View My Orders
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentCallback
