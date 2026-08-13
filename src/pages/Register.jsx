import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Home, Phone, ShieldCheck, ArrowLeft } from 'lucide-react'
import { apiFetch, resolveRole, resolvePermissions } from '../api'
import PasswordInput from '../components/PasswordInput'
import AuthLayout, { AuthField } from '../components/auth/AuthLayout'

function Register({ setToken, setRole, setPermissions }) {
  const [step, setStep] = useState('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [hostel, setHostel] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
          hostel,
          phone,
        },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.message || 'Registration failed. Check your details.')
        return
      }

      setOtp('')
      setStep('otp')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await apiFetch('/register/verify', {
        method: 'POST',
        body: { email, otp },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null
        setError(firstError || data?.message || 'That code is invalid or has expired.')
        return
      }

      const role = await resolveRole(data.token, data)
      const permissions = await resolvePermissions(data.token, data)
      setToken(data.token)
      localStorage.setItem('token', data.token)
      setRole(role)
      localStorage.setItem('role', role || '')
      setPermissions(permissions)
      navigate(role === 'admin' || role === 'super_admin' ? '/admin' : '/orders')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setResending(true)

    try {
      const response = await apiFetch('/register/resend-otp', {
        method: 'POST',
        body: { email },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.message || 'Could not resend the code.')
        return
      }

      setMessage(data?.message || 'A new code has been sent to your email.')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setResending(false)
    }
  }

  if (step === 'otp') {
    return (
      <AuthLayout
        title="Verify Your Email"
        description={`Enter the 6-digit code we sent to ${email}.`}
        onSubmit={handleVerify}
        success={message}
        error={error}
        footer={
          <button
            type="button"
            onClick={() => {
              setError('')
              setMessage('')
              setStep('form')
            }}
            className="inline-flex items-center gap-1.5 font-medium text-brand-teal hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to edit details
          </button>
        }
      >
        <AuthField
          id="otp"
          label="Verification Code"
          icon={ShieldCheck}
          type="text"
          inputMode="numeric"
          placeholder="123456"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoComplete="one-time-code"
          required
        />

        <button type="submit" disabled={submitting || otp.length !== 6} className="btn-primary mt-2">
          {submitting ? 'Verifying…' : 'Verify & Create Account'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="btn-outline"
        >
          {resending ? 'Resending…' : 'Resend Code'}
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create Your Account"
      maxWidth="md"
      onSubmit={handleRegister}
      error={error}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-teal hover:underline">
            Log In
          </Link>
        </>
      }
    >
      <AuthField
        id="name"
        label="Full Name"
        icon={User}
        placeholder="Jane Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        required
      />

      <AuthField
        id="reg-email"
        label="Email"
        icon={Mail}
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-text" htmlFor="reg-password">
            Password
          </label>
          <PasswordInput
            id="reg-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="label-text" htmlFor="password-confirmation">
            Confirm Password
          </label>
          <PasswordInput
            id="password-confirmation"
            placeholder="••••••••"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AuthField
          id="hostel"
          label="Hostel"
          icon={Home}
          placeholder="Hostel A"
          value={hostel}
          onChange={(e) => setHostel(e.target.value)}
          autoComplete="address-line1"
          required
        />

        <AuthField
          id="phone"
          label="Phone"
          icon={Phone}
          type="tel"
          placeholder="080…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          required
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary mt-2">
        {submitting ? 'Sending code…' : 'Register'}
      </button>
    </AuthLayout>
  )
}

export default Register
