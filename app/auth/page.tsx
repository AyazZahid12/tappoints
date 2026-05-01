'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register' | 'forgot' | 'reset-password'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset-password')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Email enviado. Revisa tu bandeja de entrada y sigue el enlace.')
      return
    }

    if (mode === 'reset-password') {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      setLoading(false)
      if (error) { setError(error.message); return }
      router.push('/dashboard')
      return
    }

    let authedEmail = ''

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      authedEmail = data.user?.email ?? email
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      authedEmail = data.user?.email ?? email

      if (data.user && authedEmail !== 'tappointsboss@gmail.com') {
        const slug = nombre.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50) + '-' + Math.random().toString(36).slice(2, 6)

        await supabase.from('negocios').insert({
          user_id: data.user.id,
          nombre,
          slug,
          puntos_por_visita: 1,
          puntos_para_recompensa: 10,
          recompensa: 'Premio especial',
        })
      }
    }

    if (authedEmail === 'tappointsboss@gmail.com') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const subtitles: Record<Mode, string> = {
    login: 'Accede a tu panel de negocio',
    register: 'Crea tu cuenta de negocio',
    forgot: 'Recupera tu contraseña',
    'reset-password': 'Establece tu nueva contraseña',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#E1F5EE', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#1D9E75',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px #1D9E7540'
          }}>
            <CoinIcon />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#0A1A14' }}>TapPoints</h1>
          <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 6 }}>{subtitles[mode]}</p>
        </div>

        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>Nombre del negocio</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Café El Rincón" style={inputStyle} />
              </div>
            )}

            {mode !== 'reset-password' && (
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" style={inputStyle} />
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div>
                <label style={labelStyle}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
              </div>
            )}

            {mode === 'reset-password' && (
              <div>
                <label style={labelStyle}>Nueva contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="••••••••" minLength={6} style={inputStyle} />
              </div>
            )}

            {error && (
              <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#D1FAE5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#065F46' }}>
                {success}
              </div>
            )}

            {!success && (
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: '#1D9E75', color: 'white', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: 4
              }}>
                {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Cambiar contraseña'}
              </button>
            )}
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 20 }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={linkBtnStyle}>
                  ¿Olvidaste tu contraseña?
                </button>
                <button onClick={() => { setMode('register'); setError(''); setSuccess('') }} style={linkBtnStyle}>
                  ¿No tienes cuenta? Regístrate
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={linkBtnStyle}>
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            )}
            {(mode === 'forgot' || mode === 'reset-password') && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={linkBtnStyle}>
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: '#0A1A14', background: '#FAFAFA',
  transition: 'border-color 0.15s'
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, color: '#1D9E75', fontWeight: 500, fontFamily: 'inherit'
}

function CoinIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
    </svg>
  )
}
