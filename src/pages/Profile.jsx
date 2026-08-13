import { useState, useEffect } from 'react'
import { UserCircle } from 'lucide-react'
import { apiFetch } from '../api'
import CylinderImageUpload from '../CylinderImageUpload'
import ChangePasswordForm from '../components/ChangePasswordForm'
import PageHeader from '../components/PageHeader'

function Profile({ token }) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [hostel, setHostel] = useState('')
  const [phone, setPhone] = useState('')
  const [cylinderImageUrl, setCylinderImageUrl] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiFetch('/user', { token })
        if (!response.ok) {
          setError('Could not load your profile.')
          return
        }

        const data = await response.json()
        setEmail(data.email || '')
        setName(data.name || '')
        setHostel(data.hostel || '')
        setPhone(data.phone || '')
        setCylinderImageUrl(data.cylinder_image_url || null)
      } catch {
        setError('Could not reach the server.')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [token])

  const handleSubmit = async () => {
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const response = await apiFetch('/profile', {
        method: 'PATCH',
        token,
        body: { name, hostel, phone },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.message || 'Could not update your profile.')
        return
      }

      const data = await response.json()
      setName(data.name ?? name)
      setHostel(data.hostel ?? hostel)
      setPhone(data.phone ?? phone)
      setMessage('Profile updated successfully!')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Profile" subtitle="Manage your account details." icon={UserCircle} />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Manage your account details." icon={UserCircle} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card mb-6 lg:col-span-3 lg:mb-0">
          <div className="flex flex-col gap-4">
            <div>
              <label className="label-text" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="input-field bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="label-text" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text" htmlFor="hostel">Hostel</label>
              <input
                id="hostel"
                type="text"
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-text" htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
            </div>

            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            {message && <p className="alert-success">{message}</p>}
            {error && <p className="alert-error">{error}</p>}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-brand-navy">Cylinder Image</h3>
          <CylinderImageUpload
            token={token}
            initialImageUrl={cylinderImageUrl}
            description="This image is used by default when you create an order."
            onUploaded={setCylinderImageUrl}
          />
        </div>

        <div className="card lg:col-span-3">
          <h3 className="mb-4 text-lg font-semibold text-brand-navy">Change Password</h3>
          <ChangePasswordForm token={token} />
        </div>
      </div>
    </div>
  )
}

export default Profile
