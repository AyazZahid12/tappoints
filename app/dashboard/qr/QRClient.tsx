'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase'
import { calcularNivel } from '@/lib/types'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'
const TOTAL_SECS = 30

type Phase = 'idle' | 'loading' | 'active' | 'expired'

interface PuntoPendiente {
  id: string
  cliente_id: string
  nombre: string
  telefono: string
  puntos_solicitados: number
  created_at: string
  expires_at: string
}

interface Props {
  businessName: string
  appUrl: string
  slug: string
  negocioId: string
  recompensa: string
  pointsForReward: number
  initialPendientes: PuntoPendiente[]
}

function formatDateTime(d: string) {
  const date = new Date(d)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${m}`
}

export default function QRClient({ businessName, appUrl, slug, negocioId, recompensa, pointsForReward, initialPendientes }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanToken, setScanToken] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(TOTAL_SECS)
  const [copied, setCopied] = useState(false)
  const [pendientes, setPendientes] = useState<PuntoPendiente[]>(initialPendientes)
  const [busy, setBusy] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const startCountdown = useCallback(() => {
    clearTimer()
    setCountdown(TOTAL_SECS)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearTimer(); setPhase('expired'); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Auto-refresh pendientes every 10s
  useEffect(() => {
    refreshRef.current = setInterval(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('puntos_pendientes')
        .select('id, cliente_id, nombre, telefono, puntos_solicitados, created_at, expires_at')
        .eq('negocio_id', negocioId)
        .eq('estado', 'pendiente')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })
      if (data) setPendientes(data)
    }, 10000)
    return () => {
      clearTimer()
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [negocioId])

  async function generateToken() {
    setPhase('loading')
    try {
      const res = await fetch('/api/qr-token', { method: 'POST' })
      if (!res.ok) throw new Error()
      const { token } = await res.json()
      setScanToken(token)
      setPhase('active')
      startCountdown()
    } catch {
      setPhase('idle')
    }
  }

  async function aprobar(p: PuntoPendiente) {
    setBusy(p.id)
    const supabase = createClient()

    const { data: cliente } = await supabase
      .from('clientes')
      .select('puntos, visitas, nivel')
      .eq('id', p.cliente_id)
      .single()

    if (!cliente) { setBusy(null); return }

    const nuevoPuntos = cliente.puntos + p.puntos_solicitados
    const nuevasVisitas = cliente.visitas + 1
    const nuevoNivel = calcularNivel(nuevoPuntos)
    const now = new Date().toISOString()

    await supabase.from('clientes').update({
      puntos: nuevoPuntos,
      visitas: nuevasVisitas,
      nivel: nuevoNivel,
      ultima_visita: now,
    }).eq('id', p.cliente_id)

    await supabase.from('visitas').insert({
      negocio_id: negocioId,
      cliente_id: p.cliente_id,
      puntos_ganados: p.puntos_solicitados,
    })

    // Handle coupon threshold
    let puntosFinales = nuevoPuntos
    if (nuevoPuntos >= pointsForReward) {
      const { data: existing } = await supabase
        .from('cupones').select('id').eq('cliente_id', p.cliente_id).eq('canjeado', false).limit(1)

      if (!existing || existing.length === 0) {
        const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await supabase.from('cupones').insert({
          negocio_id: negocioId, cliente_id: p.cliente_id,
          codigo, recompensa, canjeado: false,
        })
        await supabase.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', p.cliente_id)
        puntosFinales = 0
      }
    }

    await supabase.from('puntos_pendientes').update({ estado: 'aprobado' }).eq('id', p.id)
    setPendientes(prev => prev.filter(x => x.id !== p.id))
    setBusy(null)
  }

  async function rechazar(p: PuntoPendiente) {
    setBusy(p.id)
    const supabase = createClient()
    await supabase.from('puntos_pendientes').update({ estado: 'rechazado' }).eq('id', p.id)
    setPendientes(prev => prev.filter(x => x.id !== p.id))
    setBusy(null)
  }

  const scanUrl = scanToken ? `${appUrl}/scan/${scanToken}` : ''
  const staticUrl = `${appUrl}/${slug}`
  const progress = countdown / TOTAL_SECS

  function copyLink() {
    navigator.clipboard.writeText(staticUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tappoints-qr-${slug}.svg`
    a.click()
  }

  return (
    <div className="fade-up" style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Sumar punto</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>
          Genera un QR temporal para que el cliente sume un punto
        </p>
      </div>

      {/* ── Puntos pendientes ─────────────────────────────────────────────── */}
      {pendientes.length > 0 && (
        <div style={{
          background: '#FFFBEB',
          border: '2px solid #F59E0B40',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F59E0B20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#92400E' }}>
                Puntos pendientes de aprobación
              </div>
              <div style={{ fontSize: 12, color: '#92400E80', marginTop: 1 }}>
                {pendientes.length} solicitud{pendientes.length > 1 ? 'es' : ''} esperando respuesta · Caducan en 2 horas
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendientes.map(p => {
              const isBusy = busy === p.id
              const avatar = p.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={p.id} style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1.5px solid #F59E0B20',
                  opacity: isBusy ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F59E0B15', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1A14' }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: '#0A1A1460', marginTop: 1 }}>{p.telefono}</div>
                    <div style={{ fontSize: 11, color: '#0A1A1440', marginTop: 3 }}>
                      Solicitud: {formatDateTime(p.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => aprobar(p)}
                      disabled={isBusy}
                      style={{
                        padding: '7px 14px', borderRadius: 8, border: 'none',
                        background: ACCENT, color: 'white',
                        fontSize: 13, fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isBusy ? '...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => rechazar(p)}
                      disabled={isBusy}
                      style={{
                        padding: '7px 14px', borderRadius: 8,
                        border: '1.5px solid #EF444430', background: '#FEF2F2',
                        color: '#EF4444', fontSize: 13, fontWeight: 600,
                        cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── QR + info ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, maxWidth: 840, alignItems: 'flex-start' }}>
        {/* Main QR panel */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, flexShrink: 0, width: 300 }}>
          {phase === 'idle' && (
            <>
              <div style={{ width: 212, height: 212, borderRadius: 16, border: `2px dashed ${ACCENT}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#0A1A1430' }}>
                <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={ACCENT + '50'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
                </svg>
                <span style={{ fontSize: 13, color: '#0A1A1440', textAlign: 'center', lineHeight: 1.4 }}>Pulsa el botón para<br />generar el QR</span>
              </div>
              <button onClick={generateToken} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ACCENT, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${ACCENT}40`, letterSpacing: '-0.02em' }}>
                + Sumar punto
              </button>
            </>
          )}

          {phase === 'loading' && (
            <div style={{ width: 212, height: 212, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 40, height: 40, border: `3px solid ${ACCENT}30`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {(phase === 'active' || phase === 'expired') && (
            <>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <svg width={228} height={228} style={{ position: 'absolute', top: -8, left: -8, transform: 'rotate(-90deg)' }}>
                  <circle cx={114} cy={114} r={108} fill="none" stroke={ACCENT + '15'} strokeWidth={4} />
                  <circle cx={114} cy={114} r={108} fill="none" stroke={phase === 'expired' ? '#EF444450' : ACCENT} strokeWidth={4}
                    strokeDasharray={`${2 * Math.PI * 108}`}
                    strokeDashoffset={`${2 * Math.PI * 108 * (1 - progress)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div style={{ width: 212, height: 212, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: phase === 'expired' ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                  {scanToken && <div style={{ padding: 12, background: 'white', borderRadius: 10, border: '1px solid #0A1A1410' }}><QRCodeSVG value={scanUrl} size={164} fgColor="#0A1A14" bgColor="white" level="H" /></div>}
                </div>
                <div style={{ position: 'absolute', bottom: -10, right: -10, width: 44, height: 44, borderRadius: '50%', background: phase === 'expired' ? '#EF4444' : ACCENT, color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${phase === 'expired' ? '#EF444440' : ACCENT + '40'}` }}>
                  {phase === 'expired' ? '!' : countdown}
                </div>
              </div>

              {phase === 'expired' ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginBottom: 12 }}>QR expirado</p>
                  <button onClick={generateToken} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ACCENT, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${ACCENT}40` }}>+ Nuevo QR</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#0A1A1460' }}>Muestra este QR al cliente</p>
                  <p style={{ fontSize: 12, color: '#0A1A1440', marginTop: 4 }}>Expira en <strong style={{ color: countdown <= 10 ? '#EF4444' : ACCENT }}>{countdown}s</strong></p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Cómo funciona</div>
            {[
              { n: '1', text: 'Pulsa "+ Sumar punto" en el dashboard' },
              { n: '2', text: 'Muestra el QR en pantalla al cliente' },
              { n: '3', text: 'El cliente lo escanea con su móvil en 30 segundos' },
              { n: '4', text: 'Si ya sumó hoy, aparece aquí para que apruebes o rechaces' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: ACCENT + '15', color: ACCENT, fontSize: 12, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</div>
                <div style={{ fontSize: 13, color: '#0A1A1470', paddingTop: 4 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <div ref={qrRef} style={{ display: 'none' }}>
            <QRCodeSVG value={staticUrl} size={200} fgColor="#0A1A14" bgColor="white" level="H" />
          </div>

          <div style={{ background: '#F8FFFE', borderRadius: 16, padding: 20, border: `1.5px solid ${ACCENT}20`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>QR fijo del negocio</div>
            <div style={{ fontSize: 12, color: '#0A1A1460', marginBottom: 14, lineHeight: 1.5 }}>
              Este QR apunta a la página de tu negocio. Imprímelo o compártelo para que los clientes vean el programa de puntos.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={downloadQR} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1.5px solid #0A1A1415', background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#0A1A14' }}>
                <Icon name="download" size={13} color="#0A1A14" /> Descargar QR
              </button>
              <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: 'none', background: copied ? ACCENT + '20' : ACCENT + '15', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: ACCENT, transition: 'all 0.2s' }}>
                {copied ? '✓ Copiado' : 'Copiar enlace'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
