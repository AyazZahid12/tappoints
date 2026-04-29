'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularNivel } from '@/lib/types'

const ACCENT = '#1D9E75'

interface Negocio {
  id: string
  nombre: string
  recompensa: string
  puntos_para_recompensa: number
  puntos_por_visita: number
}

export default function ScanClient({ negocio, slug }: { negocio: Negocio; slug: string }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    puntos: number
    nuevoCupon: boolean
    recompensa: string
    nivel: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !telefono.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Check if client already exists
    let { data: clienteExistente } = await supabase
      .from('clientes')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('telefono', telefono.trim())
      .single()

    let clienteId: string
    let puntosActuales: number

    if (clienteExistente) {
      // Existing client: add points
      const nuevoPuntos = clienteExistente.puntos + negocio.puntos_por_visita
      const nuevasVisitas = clienteExistente.visitas + 1
      const nuevoNivel = calcularNivel(nuevoPuntos)

      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          puntos: nuevoPuntos,
          visitas: nuevasVisitas,
          nivel: nuevoNivel,
          ultima_visita: new Date().toISOString(),
        })
        .eq('id', clienteExistente.id)

      if (updateError) { setError('Error al registrar visita'); setLoading(false); return }
      clienteId = clienteExistente.id
      puntosActuales = nuevoPuntos
    } else {
      // New client
      const nuevoPuntos = negocio.puntos_por_visita
      const nuevoNivel = calcularNivel(nuevoPuntos)

      const { data: nuevoCliente, error: insertError } = await supabase
        .from('clientes')
        .insert({
          negocio_id: negocio.id,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          puntos: nuevoPuntos,
          visitas: 1,
          nivel: nuevoNivel,
          ultima_visita: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError || !nuevoCliente) { setError('Error al registrarse'); setLoading(false); return }
      clienteId = nuevoCliente.id
      puntosActuales = nuevoPuntos
    }

    // Register visit
    await supabase.from('visitas').insert({
      negocio_id: negocio.id,
      cliente_id: clienteId,
      puntos_ganados: negocio.puntos_por_visita,
    })

    // Check if coupon should be generated
    let nuevoCupon = false
    if (puntosActuales >= negocio.puntos_para_recompensa) {
      // Check if there's already a pending coupon
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

        // Reset points after generating coupon
        await supabase.from('clientes').update({
          puntos: 0,
          nivel: calcularNivel(0),
        }).eq('id', clienteId)

        nuevoCupon = true
        puntosActuales = 0
      }
    }

    setResult({
      puntos: puntosActuales,
      nuevoCupon,
      recompensa: negocio.recompensa,
      nivel: calcularNivel(puntosActuales),
    })
    setLoading(false)
  }

  const NIVEL_LABELS: Record<string, string> = { nuevo: 'Nuevo', bronce: 'Bronce', plata: 'Plata', oro: 'Oro' }
  const NIVEL_COLORS: Record<string, string> = { nuevo: '#0A1A1440', bronce: '#C2885B', plata: '#94A3B8', oro: '#F59E0B' }

  if (result) {
    return (
      <div style={{
        minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16
      }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', boxShadow: '0 8px 24px #1D9E7540'
            }}>
              <CoinSVG />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#0A1A14' }}>{negocio.nombre}</div>
          </div>

          {result.nuevoCupon ? (
            <div style={{
              background: 'white', borderRadius: 20, padding: 32,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Enhorabuena!</h2>
              <p style={{ fontSize: 15, color: '#0A1A1480', marginBottom: 20 }}>
                Has ganado una recompensa
              </p>
              <div style={{
                background: ACCENT + '12', border: `2px dashed ${ACCENT}40`,
                borderRadius: 16, padding: 20, marginBottom: 20
              }}>
                <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Tu recompensa</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{result.recompensa}</div>
                <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 8 }}>Muestra este mensaje al negocio para canjearla</div>
              </div>
              <p style={{ fontSize: 13, color: '#0A1A1460' }}>Tus puntos se han reiniciado. ¡Sigue acumulando!</p>
            </div>
          ) : (
            <div style={{
              background: 'white', borderRadius: 20, padding: 32,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', marginBottom: 8 }}>¡Visita registrada!</h2>
              <p style={{ fontSize: 15, color: '#0A1A1480', marginBottom: 24 }}>
                Gracias por visitar {negocio.nombre}
              </p>

              <div style={{
                background: '#F8FFFE', borderRadius: 14, padding: 20, marginBottom: 16
              }}>
                <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Tus puntos acumulados</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: ACCENT, letterSpacing: '-0.04em' }}>
                  {result.puntos}
                </div>
                <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 4 }}>
                  de {negocio.puntos_para_recompensa} para tu recompensa
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 6, background: '#0A1A1410', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((result.puntos / negocio.puntos_para_recompensa) * 100, 100)}%`,
                    height: '100%', background: ACCENT, borderRadius: 99,
                    transition: 'width 0.6s ease'
                  }} />
                </div>

                <div style={{ marginTop: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                    background: NIVEL_COLORS[result.nivel] + '20',
                    color: NIVEL_COLORS[result.nivel]
                  }}>{NIVEL_LABELS[result.nivel]}</span>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#0A1A1460' }}>
                Te faltan <strong style={{ color: ACCENT }}>{Math.max(0, negocio.puntos_para_recompensa - result.puntos)} puntos</strong> para: {negocio.recompensa}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 8px 24px #1D9E7540'
          }}>
            <CoinSVG />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em' }}>
            {negocio.nombre}
          </h1>
          <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 6 }}>
            Acumula puntos y gana: <strong style={{ color: ACCENT }}>{negocio.recompensa}</strong>
          </p>
        </div>

        <div style={{
          background: 'white', borderRadius: 20, padding: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A1A14' }}>Registra tu visita</h2>
            <p style={{ fontSize: 13, color: '#0A1A1460', marginTop: 4 }}>
              Introduce tus datos para sumar {negocio.puntos_por_visita} punto{negocio.puntos_por_visita > 1 ? 's' : ''}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6 }}>
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                placeholder="Tu nombre"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0A1A14', display: 'block', marginBottom: 6 }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                required
                placeholder="6XX XXX XXX"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: '#FEE2E2', borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: '#991B1B'
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: ACCENT, color: 'white', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: 4
              }}
            >
              {loading ? 'Registrando...' : `Sumar ${negocio.puntos_por_visita} punto${negocio.puntos_por_visita > 1 ? 's' : ''} ✨`}
            </button>
          </form>

          <p style={{ fontSize: 11, color: '#0A1A1440', textAlign: 'center', marginTop: 14 }}>
            Tu teléfono se usa para identificarte. No recibirás spam.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 12, color: '#0A1A1440' }}>Powered by TapPoints 💚</p>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: '#0A1A14', background: '#FAFAFA',
}

function CoinSVG() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
    </svg>
  )
}
