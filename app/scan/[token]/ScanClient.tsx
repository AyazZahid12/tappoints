'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const G = '#1D9E75'

interface Programa {
  id: string
  nombre: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
}

interface Props {
  token: string
  negocio: { id: string; nombre: string }
  programas: Programa[]
  expiresAt: string
  isAtLimit: boolean
}

type Step = 'select' | 'form' | 'loading' | 'done' | 'pending' | 'approved' | 'rejected'

export default function ScanClient({ token, negocio, programas, isAtLimit }: Props) {
  const [step, setStep] = useState<Step>(programas.length > 1 ? 'select' : 'form')
  const [programa, setPrograma] = useState<Programa | null>(programas.length === 1 ? programas[0] : null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ puntos: number; nuevoCupon: boolean; recompensa: string; nivel: string } | null>(null)
  const [approvedPuntos, setApprovedPuntos] = useState<number | null>(null)

  const pendienteIdRef = useRef<string | null>(null)
  const telefonoRef = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  useEffect(() => {
    if (step !== 'pending') return
    const supabase = createClient()
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('puntos_pendientes')
        .select('estado')
        .eq('id', pendienteIdRef.current!)
        .single()

      if (data?.estado === 'aprobado') {
        clearInterval(pollRef.current!)
        const { data: cli } = await supabase
          .from('clientes')
          .select('puntos')
          .eq('negocio_id', negocio.id)
          .eq('telefono', telefonoRef.current)
          .single()
        setApprovedPuntos(cli?.puntos ?? 0)
        setStep('approved')
      } else if (data?.estado === 'rechazado') {
        clearInterval(pollRef.current!)
        setStep('rejected')
      }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, negocio.id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStep('loading')
    setError('')
    telefonoRef.current = telefono.trim()

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          programa_id: programa?.id || null,
        }),
      })
      const data = await res.json()

      if (data.type === 'error') { setError(data.message); setStep('form'); return }
      if (data.type === 'limit') { setError('Este negocio ha alcanzado su límite de clientes.'); setStep('form'); return }
      if (data.type === 'pending') {
        pendienteIdRef.current = data.pendienteId
        setStep('pending')
        return
      }
      setResult(data)
      setStep('done')
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
      setStep('form')
    }
  }

  // ── Limit ──────────────────────────────────────────────────────────────────
  if (isAtLimit) return (
    <Screen negocio={negocio.nombre}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>Límite de clientes</h2>
        <p style={{ fontSize: 14, color: '#0A1A1460', lineHeight: 1.7 }}>
          Este negocio ha alcanzado su límite. Contacta con el negocio.
        </p>
      </div>
    </Screen>
  )

  // ── Program selection ──────────────────────────────────────────────────────
  if (step === 'select') return (
    <Wrap>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <LogoIcon />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em', marginTop: 12 }}>
          {negocio.nombre}
        </h1>
        <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 6 }}>¿A qué programa quieres apuntarte?</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programas.map(p => (
          <button
            key={p.id}
            onClick={() => { setPrograma(p); setStep('form') }}
            style={{
              background: 'white', borderRadius: 16, padding: '18px 20px',
              border: `1.5px solid ${G}20`, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1A14', marginBottom: 10 }}>{p.nombre}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip label="Pts / visita" value={String(p.puntos_por_visita)} />
              <Chip label="Meta" value={String(p.puntos_para_recompensa)} />
              <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '7px 12px', flex: 2, border: `1px solid ${G}15` }}>
                <div style={{ fontSize: 10, color: '#0A1A1460', marginBottom: 1 }}>Recompensa</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1A14' }}>🎁 {p.recompensa}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Footer />
    </Wrap>
  )

  // ── Pending ────────────────────────────────────────────────────────────────
  if (step === 'pending') return (
    <Screen negocio={negocio.nombre}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ background: G, borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 4 }}>
            Pide al empleado que apruebe tu punto
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Muéstrale esta pantalla</div>
        </div>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>Solicitud enviada</h2>
        <p style={{ fontSize: 14, color: '#0A1A1470', lineHeight: 1.6, marginBottom: 20 }}>
          Ya sumaste un punto hoy. Tu solicitud está pendiente de aprobación.
        </p>
        <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>Esperando respuesta del empleado...</div>
          <div style={{ fontSize: 12, color: '#92400E80', marginTop: 4 }}>Caduca en 2 horas si no recibe respuesta</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, color: '#0A1A1460' }}>Comprobando cada 3 segundos...</span>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </Screen>
  )

  // ── Approved ───────────────────────────────────────────────────────────────
  if (step === 'approved') return (
    <Screen negocio={negocio.nombre}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Punto sumado!</h2>
        <p style={{ fontSize: 15, color: '#0A1A1470', marginBottom: 24 }}>El empleado ha aprobado tu solicitud</p>
        {programa && (
          <div style={{ background: '#F0FDF4', border: `1.5px solid ${G}30`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Total de puntos</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: G, letterSpacing: '-0.04em' }}>{approvedPuntos}</div>
            <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 4 }}>
              de {programa.puntos_para_recompensa} para tu recompensa
            </div>
            <ProgressBar value={approvedPuntos ?? 0} max={programa.puntos_para_recompensa} />
          </div>
        )}
      </div>
    </Screen>
  )

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (step === 'rejected') return (
    <Screen negocio={negocio.nombre}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>Solicitud no aprobada</h2>
        <p style={{ fontSize: 14, color: '#0A1A1470', lineHeight: 1.6 }}>
          Tu solicitud no fue aprobada por el negocio.
        </p>
      </div>
    </Screen>
  )

  // ── Done ───────────────────────────────────────────────────────────────────
  if (step === 'done' && result) return (
    <Screen negocio={negocio.nombre}>
      {result.nuevoCupon ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Enhorabuena!</h2>
          <p style={{ fontSize: 15, color: '#0A1A1480', marginBottom: 20 }}>Has ganado una recompensa</p>
          <div style={{ background: G + '12', border: `2px dashed ${G}40`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Tu recompensa</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: G }}>{result.recompensa}</div>
            <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 8 }}>
              Muestra este mensaje al negocio para canjearla
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#0A1A1460' }}>Tus puntos se han reiniciado. ¡Sigue acumulando!</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Punto sumado!</h2>
          <p style={{ fontSize: 15, color: '#0A1A1480', marginBottom: 24 }}>Gracias por visitar {negocio.nombre}</p>
          <div style={{ background: '#F8FFFE', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Tus puntos acumulados</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: G, letterSpacing: '-0.04em' }}>{result.puntos}</div>
            {programa && (
              <>
                <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 4 }}>
                  de {programa.puntos_para_recompensa} para tu recompensa
                </div>
                <ProgressBar value={result.puntos} max={programa.puntos_para_recompensa} />
                <div style={{ fontSize: 13, color: '#0A1A1460', marginTop: 10 }}>
                  Te faltan <strong style={{ color: G }}>
                    {Math.max(0, programa.puntos_para_recompensa - result.puntos)} puntos
                  </strong> para: {result.recompensa}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Screen>
  )

  // ── Form ───────────────────────────────────────────────────────────────────
  const activePrograma = programa ?? programas[0]
  return (
    <Wrap>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <LogoIcon />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em', marginTop: 12 }}>
          {negocio.nombre}
        </h1>
        {programas.length > 1 && programa && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 13, color: '#0A1A1460' }}>{programa.nombre} · </span>
            <button
              onClick={() => { setPrograma(null); setStep('select') }}
              style={{ fontSize: 13, color: G, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              cambiar
            </button>
          </div>
        )}
        <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 6 }}>
          Suma <strong style={{ color: G }}>{activePrograma.puntos_por_visita} punto</strong> a tu tarjeta de fidelidad
        </p>
      </div>
      <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A1A14', marginBottom: 4 }}>Identifícate</h2>
        <p style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 20 }}>Introduce tus datos para sumar el punto</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nombre" type="text" value={nombre} onChange={setNombre} placeholder="Tu nombre" />
          <Field label="Teléfono" type="tel" value={telefono} onChange={setTelefono} placeholder="6XX XXX XXX" />
          {error && (
            <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={step === 'loading'}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: G, color: 'white', fontSize: 15, fontWeight: 600,
              cursor: step === 'loading' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: step === 'loading' ? 0.7 : 1,
              marginTop: 4, boxShadow: `0 4px 16px ${G}40`,
            }}
          >
            {step === 'loading' ? 'Procesando...' : 'Sumar punto ✨'}
          </button>
        </form>
        <p style={{ fontSize: 11, color: '#0A1A1440', textAlign: 'center', marginTop: 14 }}>
          Tu teléfono se usa para identificarte. No recibirás spam.
        </p>
      </div>
      <Footer />
    </Wrap>
  )
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
    </div>
  )
}

function Screen({ negocio, children }: { negocio: string; children: React.ReactNode }) {
  return (
    <Wrap>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <LogoIcon />
        <div style={{ fontWeight: 700, fontSize: 18, color: '#0A1A14', marginTop: 12 }}>{negocio}</div>
      </div>
      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {children}
      </div>
      <Footer />
    </Wrap>
  )
}

function LogoIcon() {
  return (
    <div style={{ width: 56, height: 56, borderRadius: 16, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 8px 24px ${G}40` }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
      </svg>
    </div>
  )
}

function Footer() {
  return <p style={{ fontSize: 12, color: '#0A1A1440', textAlign: 'center', marginTop: 20 }}>Powered by TapPoints 💚</p>
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: G + '12', borderRadius: 8, padding: '7px 12px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 10, color: '#0A1A1460', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: G }}>{value}</div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} required placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#0A1A14', background: '#FAFAFA' }}
      />
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#0A1A1010', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: G, borderRadius: 99 }} />
    </div>
  )
}
