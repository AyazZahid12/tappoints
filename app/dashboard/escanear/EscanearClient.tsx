'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularNivel } from '@/lib/types'

const ACCENT = '#1D9E75'
const DARK = '#0A1A14'

interface Negocio {
  id: string
  nombre: string
  recompensa: string
  puntos_para_recompensa: number
  puntos_por_visita: number
}

type VisitaHoy = {
  id: any
  puntos_ganados: any
  created_at: any
  clientes: { nombre: string } | null
}

interface ScanResult {
  nombre: string
  puntos: number
  nuevoCupon: boolean
}

type CamStatus = 'starting' | 'active' | 'error' | 'no-https' | 'unsupported'
type Mode = 'camera' | 'manual'

interface Props {
  negocio: Negocio
  visitasIniciales: VisitaHoy[]
}

export default function EscanearClient({ negocio, visitasIniciales }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processingRef = useRef(false)
  const lastValueRef = useRef('')
  const lastScanTimeRef = useRef(0)

  const [mode, setMode] = useState<Mode>('camera')
  const [camStatus, setCamStatus] = useState<CamStatus>('starting')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [history, setHistory] = useState<VisitaHoy[]>(visitasIniciales)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [manualPhone, setManualPhone] = useState('')

  // ── Core scan logic (shared by camera and manual) ─────────────────────────
  const handleScan = useCallback(async (rawValue: string) => {
    processingRef.current = true
    setProcessing(true)
    setScanError(null)
    setResult(null)

    const phone = rawValue.trim()
    const supabase = createClient()

    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('telefono', phone)
      .single()

    if (!cliente) {
      setScanError(`Cliente no registrado: ${phone}`)
      setProcessing(false)
      setTimeout(() => { setScanError(null); processingRef.current = false }, 3000)
      return
    }

    const nuevoPuntos = cliente.puntos + negocio.puntos_por_visita

    const { error: updateErr } = await supabase
      .from('clientes')
      .update({
        puntos: nuevoPuntos,
        visitas: cliente.visitas + 1,
        nivel: calcularNivel(nuevoPuntos),
        ultima_visita: new Date().toISOString(),
      })
      .eq('id', cliente.id)

    if (updateErr) {
      setScanError('Error al sumar puntos. Intenta de nuevo.')
      setProcessing(false)
      setTimeout(() => { setScanError(null); processingRef.current = false }, 3000)
      return
    }

    const now = new Date().toISOString()
    await supabase.from('visitas').insert({
      negocio_id: negocio.id,
      cliente_id: cliente.id,
      puntos_ganados: negocio.puntos_por_visita,
    })

    let puntosFinales = nuevoPuntos
    let nuevoCupon = false
    if (nuevoPuntos >= negocio.puntos_para_recompensa) {
      const { data: existing } = await supabase
        .from('cupones').select('id')
        .eq('cliente_id', cliente.id).eq('canjeado', false).limit(1)

      if (!existing?.length) {
        const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await supabase.from('cupones').insert({
          negocio_id: negocio.id, cliente_id: cliente.id,
          codigo, recompensa: negocio.recompensa, canjeado: false,
        })
        await supabase.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', cliente.id)
        nuevoCupon = true
        puntosFinales = 0
      }
    }

    const newId = Date.now().toString()
    setHistory(prev => [{
      id: newId, puntos_ganados: negocio.puntos_por_visita,
      created_at: now, clientes: { nombre: cliente.nombre },
    }, ...prev.slice(0, 19)])
    setNewIds(prev => new Set(prev).add(newId))
    setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(newId); return s }), 800)

    setResult({ nombre: cliente.nombre, puntos: puntosFinales, nuevoCupon })
    setProcessing(false)
    setTimeout(() => { setResult(null); processingRef.current = false }, 3000)
  }, [negocio])

  // ── Camera init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'camera') return

    // HTTPS check — getUserMedia requires secure context
    const isSecure = typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    if (!isSecure) { setCamStatus('no-https'); return }

    // mediaDevices availability check
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCamStatus('unsupported'); return
    }

    // BarcodeDetector check
    if (!('BarcodeDetector' in window)) {
      setCamStatus('unsupported'); return
    }

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    detectorRef.current = detector

    async function start() {
      try {
        // Simple constraints — wide compatibility with old Android/iOS
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCamStatus('active')

        intervalRef.current = setInterval(async () => {
          if (processingRef.current || !videoRef.current || videoRef.current.readyState < 2) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue
              const now = Date.now()
              if (value !== lastValueRef.current || now - lastScanTimeRef.current > 5000) {
                lastValueRef.current = value
                lastScanTimeRef.current = now
                handleScan(value)
              }
            }
          } catch { /* normal when no QR visible */ }
        }, 400)
      } catch {
        setCamStatus('error')
      }
    }

    start()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [mode, handleScan])

  function switchToManual() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setMode('manual')
  }

  function switchToCamera() {
    setCamStatus('starting')
    setMode('camera')
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = manualPhone.trim()
    if (!val || processing) return
    await handleScan(val)
    setManualPhone('')
  }

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const statusDot = camStatus === 'active' && !processing && !result && !scanError

  // ── Camera status messages ────────────────────────────────────────────────
  const CAM_MSG: Record<string, { icon: string; title: string; body: string }> = {
    error: {
      icon: '📷',
      title: 'Sin acceso a la cámara',
      body: 'Permite el acceso en la configuración del navegador y recarga la página.',
    },
    'no-https': {
      icon: '🔒',
      title: 'Se necesita HTTPS',
      body: 'La cámara solo funciona en conexiones seguras (https://). Accede desde la URL segura del dashboard.',
    },
    unsupported: {
      icon: '🌐',
      title: 'Cámara no compatible',
      body: 'Tu navegador no soporta el escáner QR automático. Usa el modo manual para introducir el teléfono del cliente.',
    },
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <style>{`
        @keyframes scanLine {
          0%   { top: 8px; opacity: 1; }
          48%  { opacity: 1; }
          50%  { top: 204px; opacity: 0; }
          51%  { top: 8px; opacity: 0; }
          52%  { opacity: 1; }
          100% { top: 204px; opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 800px) {
          .escanear-layout  { flex-direction: row !important; align-items: flex-start !important; }
          .escanear-camera  { max-width: 480px !important; }
          .escanear-history { width: 300px !important; flex-shrink: 0 !important; }
        }
      `}</style>

      <div className="escanear-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, minHeight: '100%' }}>

        {/* ── Left column ── */}
        <div className="escanear-camera" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header + mode toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: DARK }}>Escanear cliente</h1>
              <p style={{ color: `${DARK}60`, fontSize: 13, marginTop: 4 }}>
                {mode === 'camera'
                  ? `Apunta al QR del cliente para sumar ${negocio.puntos_por_visita} punto`
                  : `Introduce el teléfono del cliente para sumar ${negocio.puntos_por_visita} punto`}
              </p>
            </div>
            {/* Mode toggle pill */}
            <div style={{ display: 'flex', background: 'white', borderRadius: 10, padding: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0, marginTop: 2 }}>
              <button
                onClick={switchToCamera}
                title="Modo cámara"
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: mode === 'camera' ? ACCENT : 'transparent',
                  color: mode === 'camera' ? 'white' : `${DARK}50`,
                  fontSize: 15, transition: 'all 0.15s',
                }}
              >📷</button>
              <button
                onClick={switchToManual}
                title="Modo manual"
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: mode === 'manual' ? ACCENT : 'transparent',
                  color: mode === 'manual' ? 'white' : `${DARK}50`,
                  fontSize: 15, transition: 'all 0.15s',
                }}
              >⌨️</button>
            </div>
          </div>

          {/* ── Camera card ── */}
          {mode === 'camera' && (
            <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {/* Viewfinder — paddingTop trick instead of aspectRatio for old browsers */}
              <div style={{ position: 'relative', paddingTop: '75%', background: '#000', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      display: camStatus === 'active' ? 'block' : 'none',
                    }}
                  />

                  {/* Scan frame */}
                  {camStatus === 'active' && !processing && !result && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                    }}>
                      <div style={{ position: 'relative', width: 220, height: 220 }}>
                        {([
                          { top: 0, left: 0, borderWidth: '3px 0 0 3px' },
                          { top: 0, right: 0, borderWidth: '3px 3px 0 0' },
                          { bottom: 0, left: 0, borderWidth: '0 0 3px 3px' },
                          { bottom: 0, right: 0, borderWidth: '0 3px 3px 0' },
                        ] as React.CSSProperties[]).map((s, i) => (
                          <div key={i} style={{ position: 'absolute', width: 32, height: 32, borderColor: ACCENT, borderStyle: 'solid', borderRadius: 3, ...s }} />
                        ))}
                        <div style={{
                          position: 'absolute', left: 4, right: 4, height: 2,
                          background: `linear-gradient(90deg, transparent, ${ACCENT}cc, transparent)`,
                          animation: 'scanLine 2s ease-in-out infinite',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Processing overlay */}
                  {processing && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.65)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>Sumando punto...</span>
                    </div>
                  )}

                  {/* Success overlay */}
                  {result && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                      background: result.nuevoCupon ? 'rgba(245,158,11,0.92)' : 'rgba(29,158,117,0.92)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20,
                    }}>
                      <div style={{ fontSize: 52 }}>{result.nuevoCupon ? '🎉' : '✅'}</div>
                      <div style={{ color: 'white', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>{result.nombre}</div>
                      {result.nuevoCupon ? (
                        <div style={{ color: 'white', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
                          ¡Premio ganado!<br /><span style={{ fontSize: 12, opacity: 0.9 }}>{negocio.recompensa}</span>
                        </div>
                      ) : (
                        <div style={{ color: 'white', fontSize: 14 }}>+{negocio.puntos_por_visita} punto · {result.puntos} en total</div>
                      )}
                    </div>
                  )}

                  {/* Error / unsupported / no-https / starting states */}
                  {(camStatus === 'error' || camStatus === 'unsupported' || camStatus === 'no-https') && (() => {
                    const m = CAM_MSG[camStatus]
                    return (
                      <div style={{
                        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: '#0A1A14',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28,
                      }}>
                        <div style={{ fontSize: 40 }}>{m.icon}</div>
                        <div style={{ color: 'white', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>{m.title}</div>
                        <div style={{ color: '#ffffff60', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>{m.body}</div>
                        <button
                          onClick={switchToManual}
                          style={{
                            marginTop: 4, padding: '9px 18px', borderRadius: 10, border: 'none',
                            background: ACCENT, color: 'white', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Usar entrada manual
                        </button>
                      </div>
                    )
                  })()}

                  {camStatus === 'starting' && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: '#0A1A14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Status bar */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid #0A1A1408', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                {scanError ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>⚠️</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#EF4444' }}>{scanError}</span>
                  </div>
                ) : result ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>✓</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>
                      +{negocio.puntos_por_visita} pt a {result.nombre}{result.nuevoCupon && ' · ¡Premio generado!'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: statusDot ? ACCENT : `${DARK}25`,
                      boxShadow: statusDot ? `0 0 0 3px ${ACCENT}30` : 'none',
                    }} />
                    <span style={{ fontSize: 13, color: `${DARK}55` }}>
                      {camStatus === 'active' ? 'Escaneando · Apunta al QR del cliente'
                        : camStatus === 'error' ? 'Cámara no disponible — usa el modo manual'
                        : camStatus === 'unsupported' || camStatus === 'no-https' ? 'Cámara no disponible — usa el modo manual'
                        : 'Iniciando cámara...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Manual input card ── */}
          {mode === 'manual' && (
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 6 }}>Teléfono del cliente</div>
                <div style={{ fontSize: 13, color: `${DARK}55` }}>
                  Introduce el número que el cliente usó al registrarse
                </div>
              </div>

              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  placeholder="6XX XXX XXX"
                  disabled={processing}
                  autoComplete="off"
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12,
                    border: `1.5px solid ${DARK}15`, fontSize: 18, fontFamily: 'inherit',
                    outline: 'none', color: DARK, background: '#FAFAFA',
                    letterSpacing: '0.04em', boxSizing: 'border-box',
                    textAlign: 'center',
                  }}
                />

                {scanError && (
                  <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
                    ⚠️ {scanError}
                  </div>
                )}

                {result && (
                  <div style={{
                    background: result.nuevoCupon ? '#FEF3C7' : ACCENT + '15',
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 24 }}>{result.nuevoCupon ? '🎉' : '✅'}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{result.nombre}</div>
                      <div style={{ fontSize: 13, color: `${DARK}60` }}>
                        {result.nuevoCupon
                          ? `¡Premio ganado! — ${negocio.recompensa}`
                          : `+${negocio.puntos_por_visita} punto · ${result.puntos} en total`}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing || !manualPhone.trim()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: ACCENT, color: 'white', fontSize: 15, fontWeight: 700,
                    cursor: processing || !manualPhone.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: processing || !manualPhone.trim() ? 0.6 : 1,
                    transition: 'opacity 0.15s', boxShadow: `0 4px 16px ${ACCENT}40`,
                  }}
                >
                  {processing ? 'Sumando punto...' : '+ Sumar punto'}
                </button>
              </form>
            </div>
          )}

          {/* Instructions */}
          <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: `${DARK}45`, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
              Cómo funciona
            </div>
            {(mode === 'camera' ? [
              'El cliente abre su código QR personal en la página del negocio',
              'El empleado apunta esta cámara al código del cliente',
              'Los puntos se suman automáticamente',
            ] : [
              'El cliente te da su número de teléfono registrado',
              'Introdúcelo aquí y pulsa "Sumar punto"',
              'Los puntos se suman automáticamente a su cuenta',
            ]).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: ACCENT + '18', color: ACCENT,
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: `${DARK}65`, lineHeight: 1.55, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── History column ── */}
        <div className="escanear-history" style={{ flex: 1 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: DARK }}>Hoy</h2>
            <p style={{ color: `${DARK}45`, fontSize: 13, marginTop: 2 }}>
              {history.length === 0 ? 'Sin actividad aún' : `${history.length} escaneo${history.length > 1 ? 's' : ''}`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: `${DARK}35`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 13 }}>Los escaneos de hoy aparecerán aquí</div>
              </div>
            ) : history.map(v => {
              const nombre = v.clientes?.nombre || 'Cliente'
              const avatar = nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
              const isNew = newIds.has(v.id)
              return (
                <div key={v.id} style={{
                  background: 'white', borderRadius: 12, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: isNew ? `0 0 0 2px ${ACCENT}40, 0 2px 8px rgba(0,0,0,0.06)` : '0 1px 3px rgba(0,0,0,0.04)',
                  animation: isNew ? 'slideIn 0.35s ease' : undefined,
                  transition: 'box-shadow 0.4s ease',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT + '20', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</div>
                    <div style={{ fontSize: 11, color: `${DARK}45`, marginTop: 1 }}>{formatTime(v.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, background: ACCENT + '15', padding: '3px 9px', borderRadius: 8, flexShrink: 0 }}>
                    +{v.puntos_ganados}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
