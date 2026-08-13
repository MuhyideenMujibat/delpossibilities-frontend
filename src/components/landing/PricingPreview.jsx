import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Scale, X, Equal } from 'lucide-react'
import { apiFetch, formatNaira } from '../../api'
import Reveal from '../motion/Reveal'

const SAMPLE_KG = 12.5

function PricingPreview() {
  const [pricePerKg, setPricePerKg] = useState(null)
  const [offer, setOffer] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiFetch('/price')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const hasOffer = data?.offer_active && data?.offer_price_per_kg
        if (!cancelled && hasOffer) {
          setOffer(data)
          setPricePerKg(Number(data.offer_price_per_kg))
          return
        }
        const value = data?.price_per_kg
        if (!cancelled && value !== undefined && value !== null) setPricePerKg(Number(value))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="bg-brand-bg">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-brand-navy sm:text-3xl">One rate. No haggling.</h2>
          <p className="mt-3 text-base text-slate-600">Your total is always kg × the current price per kg — shown before you pay, every time.</p>
          {offer && (
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-brand-teal">
              {offer.offer_title || 'Active refill offer'}: {formatNaira(offer.offer_price_per_kg)} per kg
            </p>
          )}
        </div>

        <Reveal className="panel-card mx-auto mt-10 max-w-md p-6 pt-8 sm:p-8 sm:pt-10" delay={0.05}>
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <span className="figure text-2xl font-bold text-brand-navy sm:text-3xl">{SAMPLE_KG} kg</span>
              <span className="eyebrow mt-1">Refill size</span>
            </div>
            <X className="h-4 w-4 flex-shrink-0 text-slate-300" strokeWidth={2} />
            <div className="flex flex-col items-center">
              <span className="figure text-2xl font-bold text-brand-navy sm:text-3xl">
                {pricePerKg !== null ? formatNaira(pricePerKg) : '—'}
              </span>
              <span className="eyebrow mt-1">{offer ? 'Offer rate' : 'Per kg today'}</span>
            </div>
            <Equal className="h-4 w-4 flex-shrink-0 text-slate-300" strokeWidth={2} />
            <div className="flex flex-col items-center">
              <span className="figure text-2xl font-bold text-brand-ember sm:text-3xl">
                {pricePerKg !== null ? formatNaira(pricePerKg * SAMPLE_KG) : '—'}
              </span>
              <span className="eyebrow mt-1">Your total</span>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <Scale className="h-3.5 w-3.5" strokeWidth={1.8} />
            Live price, pulled straight from Dellposs — no markup at checkout.
          </p>

          <Link to="/register" className="btn-primary mt-6 w-full">
            Order Gas Now
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export default PricingPreview
