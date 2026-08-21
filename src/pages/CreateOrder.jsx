import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, MapPin, Flame, Check, ImagePlus, Camera, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { apiFetch, formatNaira, resolveImageUrl } from '../api'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import HostelSelect from '../HostelSelect'
import LocationTypeToggle from '../components/LocationTypeToggle'
import { useToast } from '../toastContext'

const KG_PRESETS = [5, 10, 12.5, 15]
const STEP_LABELS = ['Size', 'Cylinder', 'Address', 'Summary']

// Keeps the student's profile image in sync whenever they attach an image on
// an order, so future orders default to it too. Best-effort: a failure here
// shouldn't block the order, since the image is also sent directly with it.
function syncProfileImage(token, file) {
  const formData = new FormData()
  formData.append('cylinder_image', file)
  return apiFetch('/profile/cylinder-image', { method: 'POST', token, body: formData }).catch(() => null)
}

function Stepper({ step }) {
  return (
    <div className="mb-8 flex items-center">
      {STEP_LABELS.map((label, index) => {
        const done = index < step
        const active = index === step
        return (
          <div key={label} className={`flex items-center ${index < STEP_LABELS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  done
                    ? 'border-brand-teal bg-brand-teal text-white'
                    : active
                      ? 'border-brand-ember bg-brand-ember text-white'
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
              </span>
              <span className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide ${active || done ? 'text-brand-navy' : 'text-slate-300'}`}>
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && <span className={`mx-2 h-0.5 flex-1 ${done ? 'bg-brand-teal' : 'bg-slate-200'}`} aria-hidden="true" />}
          </div>
        )
      })}
    </div>
  )
}

function CreateOrder({ token }) {
  const navigate = useNavigate()
  const { show } = useToast()

  const [step, setStep] = useState(0)
  const [kg, setKg] = useState('')
  const [customKg, setCustomKg] = useState(false)
  const [locationType, setLocationType] = useState('hostel')
  const [hostelName, setHostelName] = useState('')
  const [roomDetails, setRoomDetails] = useState('')
  const [offCampusAddress, setOffCampusAddress] = useState('')
  const [cylinderImage, setCylinderImage] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [forSomeoneElse, setForSomeoneElse] = useState(false)
  const [pricePerKg, setPricePerKg] = useState(null)
  const [deliveryFeeHostel, setDeliveryFeeHostel] = useState(0)
  const [deliveryFeeOffCampus, setDeliveryFeeOffCampus] = useState(0)
  const [offer, setOffer] = useState(null)
  const [loyalty, setLoyalty] = useState(null)
  const [loyaltyProgressKg, setLoyaltyProgressKg] = useState(0)
  const [loyaltyRewardAvailable, setLoyaltyRewardAvailable] = useState(false)
  const [loyaltyKgToNextReward, setLoyaltyKgToNextReward] = useState(null)
  const [error, setError] = useState('')
  const [needsProfileImage, setNeedsProfileImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    apiFetch('/price')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.delivery_fee !== undefined && data?.delivery_fee !== null) setDeliveryFeeHostel(Number(data.delivery_fee))
        if (data?.off_campus_delivery_fee !== undefined && data?.off_campus_delivery_fee !== null) {
          setDeliveryFeeOffCampus(Number(data.off_campus_delivery_fee))
        }

        const activeOffer = data?.offer_active && data?.offer_price_per_kg
        if (activeOffer) {
          setOffer(data)
          setPricePerKg(Number(data.offer_price_per_kg))
          return
        }
        if (data?.price_per_kg !== undefined && data?.price_per_kg !== null) setPricePerKg(Number(data.price_per_kg))

        if (data?.loyalty_enabled && data?.loyalty_threshold_kg && data?.loyalty_discount_percent) {
          setLoyalty({
            thresholdKg: Number(data.loyalty_threshold_kg),
            discountPercent: Number(data.loyalty_discount_percent),
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/user', { token })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const type = data?.location_type || 'hostel'
        setLocationType(type)
        if (data?.hostel) {
          if (type === 'off_campus') setOffCampusAddress(data.hostel)
          else setHostelName(data.hostel)
        }
        if (data?.cylinder_image_url) setExistingImageUrl(data.cylinder_image_url)
        setLoyaltyProgressKg(Number(data?.loyalty_progress_kg || 0))
        setLoyaltyRewardAvailable(Boolean(data?.loyalty_reward_available))
        setLoyaltyKgToNextReward(
          data?.loyalty_kg_to_next_reward !== null && data?.loyalty_kg_to_next_reward !== undefined
            ? Number(data.loyalty_kg_to_next_reward)
            : null
        )
      })
      .catch(() => {})
  }, [token])

  const imagePreview = useMemo(() => (cylinderImage ? URL.createObjectURL(cylinderImage) : null), [cylinderImage])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const kgValue = Number(kg)
  const kgValid = kg !== '' && !Number.isNaN(kgValue) && kgValue > 0
  const deliveryFee = locationType === 'off_campus' ? deliveryFeeOffCampus : deliveryFeeHostel
  const gasCost = pricePerKg !== null && kgValid ? pricePerKg * kgValue : null
  // Mirrors the backend (OrderController::store): if this order's kg carries
  // the student past the loyalty threshold mid-order, only the kg beyond
  // what was needed to complete the coupon is discounted — not the whole
  // order, and not nothing.
  const loyaltyNeededToComplete = loyalty ? Math.max(loyalty.thresholdKg - loyaltyProgressKg, 0) : 0
  const loyaltyDiscountableKg = loyalty && kgValid ? Math.max(kgValue - loyaltyNeededToComplete, 0) : 0
  const loyaltyDiscount = loyalty && pricePerKg !== null && loyaltyDiscountableKg > 0
    ? pricePerKg * loyaltyDiscountableKg * (loyalty.discountPercent / 100)
    : 0
  const total = gasCost !== null ? gasCost - loyaltyDiscount + deliveryFee : null
  // Ordering for someone else means their cylinder photo shouldn't stand in
  // for — or overwrite — the requester's own saved default.
  const usableExistingImageUrl = forSomeoneElse ? null : existingImageUrl
  const hasImage = !!cylinderImage || !!usableExistingImageUrl
  // On campus: the hostel name (from the admin-managed list) and free-text
  // block/room detail combine into the address string the backend and rider
  // see. Off campus: the student's own typed address is used as-is.
  const hostelAddress = locationType === 'hostel'
    ? [hostelName, roomDetails.trim()].filter(Boolean).join(', ')
    : offCampusAddress.trim()
  const addressValid = locationType === 'hostel' ? hostelName.trim().length > 0 : offCampusAddress.trim().length > 0
  const canAdvance = [kgValid, hasImage, addressValid, true][step]

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setCylinderImage(file)
  }

  const handleForSomeoneElseToggle = (checked) => {
    setForSomeoneElse(checked)
    if (checked) setCylinderImage(null)
  }

  const submitOrder = async (imageFile, { syncProfile = true } = {}) => {
    if (imageFile && syncProfile) {
      await syncProfileImage(token, imageFile)
    }

    const formData = new FormData()
    formData.append('kg', kg)
    formData.append('location_type', locationType)
    formData.append('hostel_address', hostelAddress)
    if (imageFile) {
      formData.append('cylinder_image', imageFile)
    }

    const response = await apiFetch('/orders', { method: 'POST', token, body: formData })
    const data = await response.json().catch(() => null)

    if (response.status === 422) {
      setError(data?.message || 'Please add a cylinder image to continue.')
      setNeedsProfileImage(true)
      return null
    }

    if (!response.ok) {
      setError(data?.message || 'Could not create the order.')
      return null
    }

    return data
  }

  const startPayment = async (order) => {
    const payResponse = await apiFetch(`/orders/${order.id}/pay`, { method: 'POST', token })
    const payData = await payResponse.json().catch(() => null)

    if (!payResponse.ok || !payData?.authorization_url) {
      show('Order created, but payment could not start. Retry from My Orders.', { type: 'error' })
      navigate('/orders')
      return
    }

    show('Order created — redirecting you to Paystack…', { type: 'success', duration: 2500 })
    window.location.href = payData.authorization_url
  }

  const handleCheckout = async () => {
    // Guards double-fire: the confirm dialog's button disables on `submitting`,
    // but this also protects against a stray second call reaching here.
    if (submitting) return

    setConfirmOpen(false)
    setError('')
    setNeedsProfileImage(false)
    setSubmitting(true)

    try {
      const order = await submitOrder(cylinderImage, { syncProfile: !forSomeoneElse })
      if (!order) return
      await startPayment(order)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecoveryFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')
    setSubmitting(true)

    try {
      const order = await submitOrder(file)
      if (!order) return
      await startPayment(order)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = () => canAdvance && setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create Order" subtitle="Request a gas refill for delivery to your hostel." icon={PlusCircle} />

      <div className="card">
        <Stepper step={step} />

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label-text">Refill size</label>
              <div className="relative mb-3">
                <Flame className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Enter any size, e.g. 1.5 kg"
                  value={kg}
                  onChange={(e) => {
                    setKg(e.target.value)
                    setCustomKg(true)
                  }}
                  className="input-field pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {KG_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setKg(String(preset))
                      setCustomKg(false)
                    }}
                    className={`rounded-xl border-2 px-3 py-3 text-center font-heading text-sm font-bold transition-colors ${
                      !customKg && Number(kg) === preset
                        ? 'border-brand-teal bg-brand-teal/5 text-brand-teal'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {preset} kg
                  </button>
                ))}
              </div>
            </div>

            {loyalty && (
              loyaltyDiscountableKg > 0 ? (
                <div className="rounded-xl bg-brand-teal/10 px-4 py-3 text-sm text-brand-teal">
                  <p className="font-semibold">🎉 Loyalty discount unlocked!</p>
                  <p className="mt-0.5 text-xs text-brand-teal/80">
                    {loyaltyRewardAvailable
                      ? `${loyalty.discountPercent}% off this order — your count then resets so you can earn the next one.`
                      : `${loyalty.discountPercent}% off ${loyaltyDiscountableKg} of this order's ${kg} kg — the rest completes your coupon, then your count resets.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-brand-bg px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Loyalty progress</span>
                    <span className="figure font-medium text-brand-navy">
                      {loyaltyProgressKg} / {loyalty.thresholdKg} kg
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-teal"
                      style={{ width: `${Math.min(100, (loyaltyProgressKg / loyalty.thresholdKg) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {loyaltyKgToNextReward} kg more to unlock {loyalty.discountPercent}% off your next order.
                  </p>
                </div>
              )
            )}

            {pricePerKg !== null && (
              <div className="rounded-xl bg-brand-bg px-4 py-3 text-sm">
                {offer && (
                  <div className="mb-3 rounded-lg bg-white px-3 py-2 text-brand-navy">
                    <p className="font-semibold">{offer.offer_title || 'Active refill offer'}</p>
                    {offer.offer_message && <p className="mt-1 text-xs text-slate-500">{offer.offer_message}</p>}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{offer ? 'Offer price per kg' : 'Price per kg'}</span>
                  <span className="figure font-medium text-brand-navy">{formatNaira(pricePerKg)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Gas cost{kgValid ? ` (${kg} kg)` : ''}</span>
                  <span className="figure font-medium text-brand-navy">{gasCost !== null ? formatNaira(gasCost) : '—'}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-brand-teal">Loyalty discount</span>
                    <span className="figure font-medium text-brand-teal">&minus;{formatNaira(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">Delivery fee</span>
                  <span className="figure font-medium text-brand-navy">{formatNaira(deliveryFee)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Estimated total</span>
                  <span className="figure font-semibold text-brand-navy">{total !== null ? formatNaira(total) : '—'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <label className="label-text">Cylinder photo</label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-brand-bg px-3.5 py-3 text-sm">
              <input
                type="checkbox"
                checked={forSomeoneElse}
                onChange={(e) => handleForSomeoneElseToggle(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-teal"
              />
              <span className="text-slate-600">
                <span className="font-medium text-brand-navy">This isn't my cylinder</span> — I'm ordering for someone else.
                Upload their photo below; it won't replace your saved default.
              </span>
            </label>

            {imagePreview || usableExistingImageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreview || resolveImageUrl(usableExistingImageUrl)} alt="Cylinder" className="h-48 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-black/55 px-3 py-2 backdrop-blur-sm">
                  <span className="text-xs text-white">
                    {imagePreview ? (forSomeoneElse ? "Someone else's photo" : 'New photo') : 'Using your saved photo'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30">
                      <Camera className="h-3 w-3" strokeWidth={2} />
                      Camera
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30">
                      <ImagePlus className="h-3 w-3" strokeWidth={2} />
                      Gallery
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => setCylinderImage(null)}
                        className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-brand-teal hover:text-brand-teal">
                  <Camera className="h-8 w-8" strokeWidth={1.6} />
                  <span className="text-center text-sm font-medium">Take Photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </label>
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-brand-teal hover:text-brand-teal">
                  <ImagePlus className="h-8 w-8" strokeWidth={1.6} />
                  <span className="text-center text-sm font-medium">Choose from Gallery</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}

            <p className="text-xs text-slate-400">
              {forSomeoneElse
                ? "This photo is used for this order only and stays off your own profile, so our rider knows it isn't your cylinder."
                : "This helps our rider identify your cylinder at pickup — it's saved to your profile for next time."}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label-text">Delivery Location</label>
              <LocationTypeToggle value={locationType} onChange={setLocationType} className="mb-3" />
            </div>

            {locationType === 'hostel' ? (
              <>
                <div>
                  <label className="label-text" htmlFor="hostel-name">Hostel</label>
                  <HostelSelect id="hostel-name" icon={MapPin} value={hostelName} onChange={(e) => setHostelName(e.target.value)} required />
                </div>

                <div>
                  <label className="label-text" htmlFor="room-details">Block / Room (optional)</label>
                  <input
                    id="room-details"
                    type="text"
                    placeholder="e.g. Block 2, Room 14"
                    value={roomDetails}
                    onChange={(e) => setRoomDetails(e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="label-text" htmlFor="off-campus-address">Delivery address</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                  <textarea
                    id="off-campus-address"
                    placeholder="e.g. 12 Adeola Street, Yaba, Lagos"
                    value={offCampusAddress}
                    onChange={(e) => setOffCampusAddress(e.target.value)}
                    rows={3}
                    required
                    className="input-field min-h-[5.5rem] resize-y pl-9"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">This is exactly where we'll bring your refilled cylinder.</p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {(imagePreview || usableExistingImageUrl) && (
                <img src={imagePreview || resolveImageUrl(usableExistingImageUrl)} alt="Cylinder" className="h-32 w-full object-cover" />
              )}
              {forSomeoneElse && (
                <p className="bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">Not your saved cylinder — ordering on behalf of someone else</p>
              )}
              <div className="flex flex-col gap-2 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Refill size</span>
                  <span className="figure font-medium text-brand-navy">{kg} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Price per kg</span>
                  <span className="figure font-medium text-brand-navy">{pricePerKg !== null ? formatNaira(pricePerKg) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gas cost</span>
                  <span className="figure font-medium text-brand-navy">{gasCost !== null ? formatNaira(gasCost) : '—'}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-brand-teal">Loyalty discount</span>
                    <span className="figure font-medium text-brand-teal">&minus;{formatNaira(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Delivery fee</span>
                  <span className="figure font-medium text-brand-navy">{formatNaira(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="font-medium text-slate-600">Total</span>
                  <span className="figure text-base font-bold text-brand-navy">{total !== null ? formatNaira(total) : '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-2">
                  <span className="text-slate-500">Delivery address</span>
                  <span className="text-right text-slate-700">{hostelAddress}</span>
                </div>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
              You'll be redirected to Paystack to pay securely — nothing is charged until you confirm there.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={goBack} disabled={submitting} className="btn-outline">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              Back
            </button>
          )}

          {step < STEP_LABELS.length - 1 ? (
            <button type="button" onClick={goNext} disabled={!canAdvance} className="btn-primary ml-auto">
              Next
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={submitting} className="btn-primary ml-auto">
              {submitting ? 'Processing…' : 'Continue to Payment'}
            </button>
          )}
        </div>

        {error && (
          <div className="alert-error mt-4 flex flex-col gap-3">
            <p>{error}</p>

            {needsProfileImage && (
              <div>
                <label className="label-text text-red-700">Upload a cylinder image now to continue:</label>
                <input type="file" accept="image/*" onChange={handleRecoveryFileChange} disabled={submitting} className="file-input" />
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Place this order?"
        message={`${kg} kg for ${total !== null ? formatNaira(total) : '—'} — you'll be sent to Paystack to pay.`}
        confirmLabel="Confirm & Pay"
        busy={submitting}
        onConfirm={handleCheckout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default CreateOrder
