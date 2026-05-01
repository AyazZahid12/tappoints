'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularNivel } from '@/lib/types'

const ACCENT = '#1D9E75'

const NIVEL_LABELS: Record<string, string> = { nuevo: 'Nuevo', bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }
const NIVEL_COLORS: Record<string, string> = { nuevo: '#0A1A1440', bronce: '#C2885B', plata: '#94A3B8', oro: '#F59E0B' }

interface Negocio {
  id: string
  nombre: string
  recompensa: string
  puntos_para_recompensa: number
  puntos_por_visita: number
}

interface Props {
  token: string
  negocio: Negocio
  expiresAt: string
}

type Phase = 'form' | 'loading' | 'pending' | 'approved' | 'rejected' | 'done'

type Result = {
  puntos: number
  nuevoCupon: boolean
  recompensa: string
  nivel: string
  nombre: string
}

export default function ScanClient({ token, negocio, expiresAt }: Props) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [approvedPuntos, setApprovedPuntos] = useState<number | null>(null)

  const pendienteIdRef = useRef<string | null>(null)
  const negocioIdRef = useRef(negocio.id)
  const telefonoRef = useRef('')
  const nombreRef = useRef('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPoll(), [])

  useEffect(() => {
    if (phase !== 'pending' || !pendienteIdRef.current) return

    const supabase = createClient()
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('puntos_pendientes')
        .select('estado')
        .eq('id', pendienteIdRef.current)
        .single()

      if (!data) return

      if (data.estado === 'aprobado') {
        stopPoll()
        const { data: cli } = await supabase
          .from('clientes')
          .select('puntos, nivel')
          .eq('negocio_id', negocioIdRef.current)
          .eq('telefono', telefonoRef.current)
          .single()
        setApprovedPuntos(cli?.puntos ?? 0)
        setPhase('approved')
      } else if (data.estado === 'rechazado') {
        stopPoll()
        setPhase('rejected')
      }
    }, 3000)

    return stopPoll
  }, [phase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !telefono.trim()) return
    setPhase('loading')
    setError('')

    telefonoRef.current = telefono.trim()
    nombreRef.current = nombre.trim()

    if (new Date(expiresAt) < new Date()) {
      setError('Este QR ha expirado. Pide al negocio que genere uno nuevo.')
      setPhase('form')
      return
    }

    const supabase = createClient()

    const { data: updated } = await supabase
      .from('qr_tokens')
      .update({ used: true })
      .eq('token', token)
      .eq('used', false)
      .select('id')

    if (!updated || updated.length === 0) {
      setError('Este QR ya fue utilizado.')
      setPhase('form')
      return
    }

    // Find or create client
    let { data: clienteExistente } = await supabase
      .from('clientes')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('telefono', telefono.trim())
      .single()

    let clienteId: string
    let puntosActuales: number
    let isNew = false

    if (clienteExistente) {
      // Check 24h cooldown
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentVisit } = await supabase
        .from('visitas')
        .select('id')
        .eq('cliente_id', clienteExistente.id)
        .gte('created_at', cutoff)
        .limit(1)

      if (recentVisit && recentVisit.length > 0) {
        // Cooldown active → create pending request
        const { data: pendiente, error: pendErr } = await supabase
          .from('puntos_pendientes')
          .insert({
            negocio_id: negocio.id,
            cliente_id: clienteExistente.id,
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            puntos_solicitados: negocio.puntos_por_visita,
          })
          .select('id')
          .single()

        if (pendErr || !pendiente) {
          setError('Error al enviar la solicitud. Inténtalo de nuevo.')
          setPhase('form')
          return
        }

        pendienteIdRef.current = pendiente.id
        setPhase('pending')
        return
      }

      // No cooldown → add point directly
      const nuevoPuntos = clienteExistente.puntos + negocio.puntos_por_visita
      await supabase.from('clientes').update({
        puntos: nuevoPuntos,
        visitas: clienteExistente.visitas + 1,
        nivel: calcularNivel(nuevoPuntos),
        ultima_visita: new Date().toISOString(),
      }).eq('id', clienteExistente.id)

      clienteId = clienteExistente.id
      puntosActuales = nuevoPuntos
    } else {
      // New client
      const nuevoPuntos = negocio.puntos_por_visita
      const { data: nuevoCliente, error: insertError } = await supabase
        .from('clientes')
        .insert({
          negocio_id: negocio.id,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          puntos: nuevoPuntos,
          visitas: 1,
          nivel: calcularNivel(nuevoPuntos),
          ultima_visita: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError || !nuevoCliente) {
        setError('Error al registrarte. Inténtalo de nuevo.')
        setPhase('form')
        return
      }

      clienteId = nuevoCliente.id
      puntosActuales = nuevoPuntos
      isNew = true
    }

    // Register visit
    await supabase.from('visitas').insert({
      negocio_id: negocio.id,
      cliente_id: clienteId,
      puntos_ganados: negocio.puntos_por_visita,
    })

    // Generate coupon if threshold reached
    let nuevoCupon = false
    if (puntosActuales >= negocio.puntos_para_recompensa) {
      const { data: cuponExistente } = await supabase
        .from('cupones')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('canjeado', false)
        .limit(1)

      if (!cuponExistente || cuponExistente.length === 0) {
        const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await supabase.from('cupones').insert({
          negocio_id: negocio.id,
          cliente_id: clienteId,
          codigo,
          recompensa: negocio.recompensa,
          canjeado: false,
        })
        await supabase.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', clienteId)
        nuevoCupon = true
        puntosActuales = 0
      }
    }

    setResult({
      puntos: puntosActuales,
      nuevoCupon,
      recompensa: negocio.recompensa,
      nivel: calcularNivel(puntosActuales),
      nombre: nombre.trim(),
    })
    setPhase('done')
  }

  // ── Pending ────────────────────────────────────────────────────────────────
  if (phase === 'pending') {
    return (
      <Screen negocioNombre={negocio.nombre}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>
            Solicitud enviada
          </h2>
          <p style={{ fontSize: 14, color: '#0A1A1470', lineHeight: 1.6, marginBottom: 20 }}>
            Ya sumaste un punto hoy. Tu solicitud está pendiente de aprobación por el negocio.
          </p>
          <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
              Esperando respuesta del empleado...
            </div>
            <div style={{ fontSize: 12, color: '#92400E80', marginTop: 4 }}>
              Caduca en 2 horas si no recibe respuesta
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, color: '#0A1A1460' }}>Comprobando cada 3 segundos...</span>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </Screen>
    )
  }

  // ── Approved ───────────────────────────────────────────────────────────────
  if (phase === 'approved') {
    return (
      <Screen negocioNombre={negocio.nombre}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>
            ¡Punto sumado!
          </h2>
          <p style={{ fontSize: 15, color: '#0A1A1470', marginBottom: 24 }}>
            El empleado ha aprobado tu solicitud
          </p>
          <div style={{ background: '#F0FDF4', border: `1.5px solid ${ACCENT}30`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Total de puntos</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: ACCENT, letterSpacing: '-0.04em' }}>
              {approvedPuntos}
            </div>
            <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 4 }}>
              de {negocio.puntos_para_recompensa} para tu recompensa
            </div>
            <div style={{ width: '100%', height: 6, background: '#0A1A1010', borderRadius: 99, marginTop: 16, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(((approvedPuntos ?? 0) / negocio.puntos_para_recompensa) * 100, 100)}%`, height: '100%', background: ACCENT, borderRadius: 99 }} />
            </div>
          </div>
        </div>
      </Screen>
    )
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (phase === 'rejected') {
    return (
      <Screen negocioNombre={negocio.nombre}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>
            Solicitud no aprobada
          </h2>
          <p style={{ fontSize: 14, color: '#0A1A1470', lineHeight: 1.6 }}>
            Tu solicitud no fue aprobada por el negocio.
          </p>
        </div>
      </Screen>
    )
  }

  // ── Done (direct) ──────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    return (
      <Screen negocioNombre={negocio.nombre}>
        {result.nuevoCupon ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Enhorabuena!</h2>
            <p style={{ fontSize: 15, color: '#0A1A1480', marginBottom: 20 }}>Has ganado una recompensa</p>
            <div style={{ background: ACCENT + '12', border: `2px dashed ${ACCENT}40`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Tu recompensa</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{result.recompensa}</div>
              <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 8 }}>Muestra este mensaje al negocio para canjearla</div>
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
              <div style={{ fontSize: 40, fontWeight: 700, color: ACCENT, letterSpacing: '-0.04em' }}>{result.puntos}</div>
              <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 4 }}>de {negocio.puntos_para_recompensa} para tu recompensa</div>
              <div style={{ width: '100%', height: 6, background: '#0A1A1010', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((result.puntos / negocio.puntos_para_recompensa) * 100, 100)}%`, height: '100%', background: ACCENT, borderRadius: 99 }} />
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: NIVEL_COLORS[result.nivel] + '20', color: NIVEL_COLORS[result.nivel] }}>
                  {NIVEL_LABELS[result.nivel]}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginTop: 16 }}>
              Te faltan <strong style={{ color: ACCENT }}>{Math.max(0, negocio.puntos_para_recompensa - result.puntos)} puntos</strong> para: {result.recompensa}
            </div>
          </div>
        )}
      </Screen>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <LogoIcon />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em', marginTop: 12 }}>
            {negocio.nombre}
          </h1>
          <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 6 }}>
            Suma <strong style={{ color: ACCENT }}>{negocio.puntos_por_visita} punto</strong> a tu tarjeta de fidelidad
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A1A14' }}>Identifícate</h2>
            <p style={{ fontSize: 13, color: '#0A1A1460', marginTop: 4 }}>Introduce tus datos para sumar el punto</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6 }}>Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Tu nombre" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6 }}>Teléfono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="6XX XXX XXX" style={inputStyle} />
            </div>
            {error && <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>{error}</div>}
            <button type="submit" disabled={phase === 'loading'} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ACCENT, color: 'white', fontSize: 15, fontWeight: 600, cursor: phase === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: phase === 'loading' ? 0.7 : 1, marginTop: 4, boxShadow: `0 4px 16px ${ACCENT}40` }}>
              {phase === 'loading' ? 'Procesando...' : 'Sumar punto ✨'}
            </button>
          </form>
          <p style={{ fontSize: 11, color: '#0A1A1440', textAlign: 'center', marginTop: 14 }}>Tu teléfono se usa para identificarte. No recibirás spam.</p>
        </div>
        <p style={{ fontSize: 12, color: '#0A1A1440', textAlign: 'center', marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}

function Screen({ negocioNombre, children }: { negocioNombre: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LogoIcon />
          <div style={{ fontWeight: 700, fontSize: 18, color: '#0A1A14', marginTop: 12 }}>{negocioNombre}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {children}
        </div>
        <p style={{ fontSize: 12, color: '#0A1A1440', textAlign: 'center', marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: '#0A1A14', background: '#FAFAFA',
}

function LogoIcon() {
  return (
    <div style={{ width: 56, height: 56, borderRadius: 16, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px #1D9E7540' }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
      </svg>
    </div>
  )
}
