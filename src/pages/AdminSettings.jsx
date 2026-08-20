import { useState, useEffect } from 'react'
import { Megaphone, Send, Tag } from 'lucide-react'
import { apiFetch, formatNaira } from '../api'
import PageHeader from '../components/PageHeader'

function AdminSettings({ token }) {
  const [price, setPrice] = useState(null)
  const [newPrice, setNewPrice] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [offCampusDeliveryFee, setOffCampusDeliveryFee] = useState('')
  const [offerActive, setOfferActive] = useState(false)
  const [offerTitle, setOfferTitle] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
  const [loyaltyThresholdKg, setLoyaltyThresholdKg] = useState('')
  const [loyaltyDiscountPercent, setLoyaltyDiscountPercent] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await apiFetch('/settings/price', { token })

        if (!response.ok) {
          setError('Could not load the current price.')
          return
        }

        const data = await response.json()
        const currentPrice = data.price_per_kg ?? data.data?.price_per_kg
        setPrice(currentPrice)
        setNewPrice(currentPrice ?? '')
        setDeliveryFee(data.delivery_fee ?? data.data?.delivery_fee ?? '')
        setOffCampusDeliveryFee(data.off_campus_delivery_fee ?? data.data?.off_campus_delivery_fee ?? '')
        setOfferActive(Boolean(data.offer_active))
        setOfferTitle(data.offer_title || '')
        setOfferMessage(data.offer_message || '')
        setOfferPrice(data.offer_price_per_kg || '')
        setLoyaltyEnabled(Boolean(data.loyalty_enabled))
        setLoyaltyThresholdKg(data.loyalty_threshold_kg || '')
        setLoyaltyDiscountPercent(data.loyalty_discount_percent || '')
      } catch {
        setError('Could not reach the server.')
      }
    }

    fetchPrice()
  }, [token])

  const handleSubmit = async () => {
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const response = await apiFetch('/settings/price', {
        method: 'PATCH',
        token,
        body: {
          price_per_kg: newPrice,
          delivery_fee: deliveryFee || 0,
          off_campus_delivery_fee: offCampusDeliveryFee || 0,
          offer_active: offerActive,
          offer_title: offerTitle,
          offer_message: offerMessage,
          offer_price_per_kg: offerPrice || null,
          loyalty_enabled: loyaltyEnabled,
          loyalty_threshold_kg: loyaltyThresholdKg || null,
          loyalty_discount_percent: loyaltyDiscountPercent || null,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.message || 'Could not update the price.')
        return
      }

      const data = await response.json()
      const updatedPrice = data.price_per_kg ?? data.data?.price_per_kg ?? newPrice
      setPrice(updatedPrice)
      setNewPrice(updatedPrice)
      setDeliveryFee(data.delivery_fee ?? data.data?.delivery_fee ?? deliveryFee)
      setOffCampusDeliveryFee(data.off_campus_delivery_fee ?? data.data?.off_campus_delivery_fee ?? offCampusDeliveryFee)
      setOfferActive(Boolean(data.offer_active))
      setOfferTitle(data.offer_title || '')
      setOfferMessage(data.offer_message || '')
      setOfferPrice(data.offer_price_per_kg || '')
      setLoyaltyEnabled(Boolean(data.loyalty_enabled))
      setLoyaltyThresholdKg(data.loyalty_threshold_kg || '')
      setLoyaltyDiscountPercent(data.loyalty_discount_percent || '')
      setMessage('Settings updated successfully.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const handleBroadcast = async () => {
    setError('')
    setBroadcastMessage('')
    setBroadcasting(true)

    try {
      const subject = offerTitle || 'D’EL-Possibilities gas refill offer'
      const body = offerMessage || `We have a gas refill offer available now${offerPrice ? ` at ${formatNaira(offerPrice)} per kg` : ''}. Rush to get your cylinder filled.`
      const response = await apiFetch('/settings/broadcast-offer', {
        method: 'POST',
        token,
        body: { subject, message: body },
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.message || 'Could not send broadcast.')
        return
      }

      setBroadcastMessage(`Broadcast sent to ${data.recipients || 0} student${data.recipients === 1 ? '' : 's'}.`)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Price Settings" subtitle="Manage pricing, offers, and student announcements." icon={Tag} />

      <div className="card">
        {price !== null && (
          <div className="mb-6 rounded-xl bg-brand-navy px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Current Price</p>
            <p className="figure mt-1 text-2xl font-semibold">{formatNaira(price)} <span className="text-sm font-normal text-white/60">/ kg</span></p>
            {offerActive && offerPrice && (
              <p className="mt-2 text-sm text-white/75">Active offer: {formatNaira(offerPrice)} / kg</p>
            )}
            <p className="mt-2 text-sm text-white/75">On-campus delivery: {formatNaira(deliveryFee || 0)}</p>
            <p className="mt-1 text-sm text-white/75">Off-campus delivery: {formatNaira(offCampusDeliveryFee || 0)}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text" htmlFor="new-price">New Price (per kg)</label>
              <input
                id="new-price"
                type="number"
                placeholder="e.g. 1200"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text" htmlFor="delivery-fee">On-Campus Delivery Fee (flat)</label>
              <input
                id="delivery-fee"
                type="number"
                placeholder="e.g. 300"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text" htmlFor="off-campus-delivery-fee">Off-Campus Delivery Fee (flat)</label>
              <input
                id="off-campus-delivery-fee"
                type="number"
                placeholder="e.g. 800"
                min="0"
                value={offCampusDeliveryFee}
                onChange={(e) => setOffCampusDeliveryFee(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={offerActive}
                onChange={(e) => setOfferActive(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-teal"
              />
              <span>
                <span className="block text-sm font-semibold text-brand-navy">Enable offer price</span>
                <span className="block text-sm text-slate-500">Students will see and pay the offer rate while it is active.</span>
              </span>
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text" htmlFor="offer-title">Offer title</label>
                <input
                  id="offer-title"
                  type="text"
                  placeholder="Weekend refill discount"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text" htmlFor="offer-price">Offer price per kg</label>
                <input
                  id="offer-price"
                  type="number"
                  placeholder="e.g. 900"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* <div className="mt-4">
              <label className="label-text" htmlFor="offer-message">Broadcast message</label>
              <textarea
                id="offer-message"
                rows="4"
                placeholder="We have a refill offer on ground. Rush to get your cylinder filled at this rate per kg."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                className="input-field min-h-28 resize-y"
              />
            </div> */}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={loyaltyEnabled}
                onChange={(e) => setLoyaltyEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-teal"
              />
              <span>
                <span className="block text-sm font-semibold text-brand-navy">Enable loyalty discount</span>
                <span className="block text-sm text-slate-500">
                  Once a student's cumulative refill kg reaches the threshold below, their next order automatically
                  gets the discount applied — their count then resets to 0 so they build up toward the next reward.
                </span>
              </span>
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text" htmlFor="loyalty-threshold">Kg required to unlock reward</label>
                <input
                  id="loyalty-threshold"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 50"
                  value={loyaltyThresholdKg}
                  onChange={(e) => setLoyaltyThresholdKg(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text" htmlFor="loyalty-discount">Discount when unlocked (%)</label>
                <input
                  id="loyalty-discount"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 10"
                  value={loyaltyDiscountPercent}
                  onChange={(e) => setLoyaltyDiscountPercent(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            <Tag className="h-4 w-4" strokeWidth={2} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>

          {/* <button onClick={handleBroadcast} disabled={broadcasting} className="btn-outline">
            {broadcasting ? <Megaphone className="h-4 w-4" strokeWidth={2} /> : <Send className="h-4 w-4" strokeWidth={2} />}
            {broadcasting ? 'Sending broadcast…' : 'Send Offer Broadcast'}
          </button> */}

          {message && <p className="alert-success">{message}</p>}
          {broadcastMessage && <p className="alert-success">{broadcastMessage}</p>}
          {error && <p className="alert-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
