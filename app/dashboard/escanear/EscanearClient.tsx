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

type CamStatus = 'starting' | 'active' | 'error' | 'unsupported'

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

  const [camStatus, setCamStatus] = useState<CamStatus>('starting')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [history, setHistory] = useState<VisitaHoy[]>(visitasIniciales)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

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
      setTimeout(() => {
        setScanError(null)
        processingRef.current = false
      }, 3000)
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
      setTimeout(() => {
        setScanError(null)
        processingRef.current = false
      }, 3000)
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
        .from('cupones')
        .select('id')
        .eq('cliente_id', cliente.id)
        .eq('canjeado', false)
        .limit(1)

      if (!existing?.length) {
        const codigo = 'TPC-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await supabase.from('cupones').insert({
          negocio_id: negocio.id,
          cliente_id: cliente.id,
          codigo,
          recompensa: negocio.recompensa,
          canjeado: false,
        })
        await supabase.from('clientes').update({ puntos: 0, nivel: calcularNivel(0) }).eq('id', cliente.id)
        nuevoCupon = true
        puntosFinales = 0
      }
    }

    const newId = Date.now().toString()
    const newEntry: VisitaHoy = {
      id: newId,
      puntos_ganados: negocio.puntos_por_visita,
      created_at: now,
      clientes: { nombre: cliente.nombre },
    }
    setHistory(prev => [newEntry, ...prev.slice(0, 19)])
    setNewIds(prev => new Set(prev).add(newId))
    setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(newId); return s }), 800)

    setResult({ nombre: cliente.nombre, puntos: puntosFinales, nuevoCupon })
    setProcessing(false)
    setTimeout(() => {
      setResult(null)
      processingRef.current = false
    }, 3000)
  }, [negocio])

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setCamStatus('unsupported')
      return
    }

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    detectorRef.current = detector

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
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
          } catch { /* detection errors are normal when no QR is visible */ }
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
  }, [handleScan])

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const statusDot = camStatus === 'active' && !processing && !result && !scanError

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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 800px) {
          .escanear-layout { flex-direction: row !important; align-items: flex-start !important; }
          .escanear-camera { max-width: 480px !important; }
          .escanear-history { width: 300px !important; flex-shrink: 0 !important; }
        }
      `}</style>

      <div className="escanear-layout" style={{
        display: 'flex', flexDirection: 'column', gap: 24, padding: 24, minHeight: '100%',
      }}>

        {/* Camera column */}
        <div className="escanear-camera" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: DARK }}>Escanear cliente</h1>
            <p style={{ color: `${DARK}60`, fontSize: 13, marginTop: 4 }}>
              Apunta al código QR del cliente para sumar {negocio.puntos_por_visita} punto automáticamente
            </p>
          </div>

          {/* Camera card */}
          <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            {/* Viewfinder */}
            <div style={{ position: 'relative', aspectRatio: '4/3', background: '#000', overflow: 'hidden' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: camStatus === 'active' ? 'block' : 'none',
                }}
              />

              {/* Scan frame overlay */}
              {camStatus === 'active' && !processing && !result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ position: 'relative', width: 220, height: 220 }}>
                    {/* Corner brackets */}
                    {([
                      { top: 0, left: 0, borderWidth: '3px 0 0 3px' },
                      { top: 0, right: 0, borderWidth: '3px 3px 0 0' },
                      { bottom: 0, left: 0, borderWidth: '0 0 3px 3px' },
                      { bottom: 0, right: 0, borderWidth: '0 3px 3px 0' },
                    ] as React.CSSProperties[]).map((s, i) => (
                      <div key={i} style={{
                        position: 'absolute', width: 32, height: 32,
                        borderColor: ACCENT, borderStyle: 'solid', borderRadius: 3, ...s,
                      }} />
                    ))}
                    {/* Animated scan line */}
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
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: `3px solid ${ACCENT}`, borderTopColor: 'transparent',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>Sumando punto...</span>
                </div>
              )}

              {/* Success overlay */}
              {result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: result.nuevoCupon ? 'rgba(245,158,11,0.92)' : 'rgba(29,158,117,0.92)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: 20,
                }}>
                  <div style={{ fontSize: 52 }}>{result.nuevoCupon ? '🎉' : '✅'}</div>
                  <div style={{ color: 'white', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
                    {result.nombre}
                  </div>
                  {result.nuevoCupon ? (
                    <div style={{ color: 'white', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
                      ¡Premio ganado!<br />
                      <span style={{ fontSize: 12, opacity: 0.9 }}>{negocio.recompensa}</span>
                    </div>
                  ) : (
                    <div style={{ color: 'white', fontSize: 14 }}>
                      +{negocio.puntos_por_visita} punto · {result.puntos} en total
                    </div>
                  )}
                </div>
              )}

              {/* Camera error */}
              {camStatus === 'error' && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#0A1A14',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: 28,
                }}>
                  <div style={{ fontSize: 40 }}>📷</div>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
                    Sin acceso a la cámara
                  </div>
                  <div style={{ color: '#ffffff60', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
                    Permite el acceso en tu navegador para poder escanear códigos QR
                  </div>
                </div>
              )}

              {/* Unsupported browser */}
              {camStatus === 'unsupported' && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#0A1A14',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: 28,
                }}>
                  <div style={{ fontSize: 40 }}>🌐</div>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 600, textAlign: 'center' }}>
                    Navegador no compatible
                  </div>
                  <div style={{ color: '#ffffff60', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
                    Usa Chrome o Safari actualizados para escanear QR
                  </div>
                </div>
              )}

              {/* Starting */}
              {camStatus === 'starting' && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#0A1A14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: `2.5px solid ${ACCENT}`, borderTopColor: 'transparent',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                </div>
              )}
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
                    +{negocio.puntos_por_visita} pt a {result.nombre}
                    {result.nuevoCupon && ' · ¡Premio generado!'}
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
                      : camStatus === 'error' ? 'Cámara no disponible'
                      : camStatus === 'unsupported' ? 'Navegador no compatible'
                      : 'Iniciando cámara...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div style={{
            background: 'white', borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: `${DARK}45`,
              letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14,
            }}>Cómo funciona</div>
            {[
              'El cliente abre su código QR personal en la página del negocio',
              'El empleado apunta esta cámara al código del cliente',
              'Los puntos se suman automáticamente',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: ACCENT + '18', color: ACCENT,
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: `${DARK}65`, lineHeight: 1.55, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History column */}
        <div className="escanear-history" style={{ flex: 1 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: DARK }}>Hoy</h2>
            <p style={{ color: `${DARK}45`, fontSize: 13, marginTop: 2 }}>
              {history.length === 0 ? 'Sin actividad aún' : `${history.length} escaneo${history.length > 1 ? 's' : ''}`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 14, padding: '28px 20px',
                textAlign: 'center', color: `${DARK}35`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 13 }}>Los escaneos de hoy aparecerán aquí</div>
              </div>
            ) : (
              history.map(v => {
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
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: ACCENT + '20', color: ACCENT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: DARK,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{nombre}</div>
                      <div style={{ fontSize: 11, color: `${DARK}45`, marginTop: 1 }}>
                        {formatTime(v.created_at)}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: ACCENT,
                      background: ACCENT + '15', padding: '3px 9px', borderRadius: 8, flexShrink: 0,
                    }}>+{v.puntos_ganados}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
