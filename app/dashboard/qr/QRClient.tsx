'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'
const TOTAL_SECS = 30

type Phase = 'idle' | 'loading' | 'active' | 'expired'

export default function QRClient({ businessName, appUrl, slug }: {
  businessName: string
  appUrl: string
  slug: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanToken, setScanToken] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(TOTAL_SECS)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const startCountdown = useCallback(() => {
    clearTimer()
    setCountdown(TOTAL_SECS)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearTimer()
          setPhase('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => clearTimer(), [])

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

  const scanUrl = scanToken ? `${appUrl}/scan/${scanToken}` : ''
  const staticUrl = `${appUrl}/${slug}`
  const progress = countdown / TOTAL_SECS
  const circumference = 2 * Math.PI * 28
  const dash = circumference * progress

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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Sumar punto</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>
          Genera un QR temporal para que el cliente sume un punto
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, maxWidth: 840, alignItems: 'flex-start' }}>
        {/* Main QR panel */}
        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          flexShrink: 0, width: 300
        }}>
          {phase === 'idle' && (
            <>
              <div style={{
                width: 212, height: 212, borderRadius: 16,
                border: `2px dashed ${ACCENT}40`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 12, color: '#0A1A1430'
              }}>
                <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
                  stroke={ACCENT + '50'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
                </svg>
                <span style={{ fontSize: 13, color: '#0A1A1440', textAlign: 'center', lineHeight: 1.4 }}>
                  Pulsa el botón para<br />generar el QR
                </span>
              </div>
              <button
                onClick={generateToken}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: ACCENT, color: 'white', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 4px 16px ${ACCENT}40`, letterSpacing: '-0.02em'
                }}
              >
                + Sumar punto
              </button>
            </>
          )}

          {phase === 'loading' && (
            <div style={{ width: 212, height: 212, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 40, height: 40, border: `3px solid ${ACCENT}30`,
                borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          )}

          {(phase === 'active' || phase === 'expired') && (
            <>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {/* Countdown ring */}
                <svg width={228} height={228} style={{ position: 'absolute', top: -8, left: -8, transform: 'rotate(-90deg)' }}>
                  <circle cx={114} cy={114} r={108} fill="none" stroke={ACCENT + '15'} strokeWidth={4} />
                  <circle
                    cx={114} cy={114} r={108} fill="none"
                    stroke={phase === 'expired' ? '#EF444450' : ACCENT}
                    strokeWidth={4}
                    strokeDasharray={`${2 * Math.PI * 108}`}
                    strokeDashoffset={`${2 * Math.PI * 108 * (1 - progress)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>

                <div style={{
                  width: 212, height: 212,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: phase === 'expired' ? 0.3 : 1,
                  transition: 'opacity 0.3s'
                }}>
                  {phase === 'active' && scanToken && (
                    <div style={{ padding: 12, background: 'white', borderRadius: 10, border: '1px solid #0A1A1410' }}>
                      <QRCodeSVG value={scanUrl} size={164} fgColor="#0A1A14" bgColor="white" level="H" />
                    </div>
                  )}
                  {phase === 'expired' && scanToken && (
                    <div style={{ padding: 12, background: 'white', borderRadius: 10, border: '1px solid #0A1A1410' }}>
                      <QRCodeSVG value={scanUrl} size={164} fgColor="#0A1A14" bgColor="white" level="H" />
                    </div>
                  )}
                </div>

                {/* Countdown badge */}
                <div style={{
                  position: 'absolute', bottom: -10, right: -10,
                  width: 44, height: 44, borderRadius: '50%',
                  background: phase === 'expired' ? '#EF4444' : ACCENT,
                  color: 'white', fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 2px 8px ${phase === 'expired' ? '#EF444440' : ACCENT + '40'}`
                }}>
                  {phase === 'expired' ? '!' : countdown}
                </div>
              </div>

              {phase === 'expired' ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginBottom: 12 }}>QR expirado</p>
                  <button
                    onClick={generateToken}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                      background: ACCENT, color: 'white', fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${ACCENT}40`
                    }}
                  >
                    + Nuevo QR
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#0A1A1460' }}>
                    Muestra este QR al cliente
                  </p>
                  <p style={{ fontSize: 12, color: '#0A1A1440', marginTop: 4 }}>
                    Expira en <strong style={{ color: countdown <= 10 ? '#EF4444' : ACCENT }}>{countdown}s</strong>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* How it works */}
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Cómo funciona</div>
            {[
              { n: '1', text: 'Pulsa "+ Sumar punto" en el dashboard' },
              { n: '2', text: 'Muestra el QR en pantalla al cliente' },
              { n: '3', text: 'El cliente lo escanea con su móvil en 30 segundos' },
              { n: '4', text: 'El punto se suma automáticamente a su cuenta' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: ACCENT + '15',
                  color: ACCENT, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{s.n}</div>
                <div style={{ fontSize: 13, color: '#0A1A1470', paddingTop: 4 }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* Static QR download */}
          <div ref={qrRef} style={{ display: 'none' }}>
            <QRCodeSVG value={staticUrl} size={200} fgColor="#0A1A14" bgColor="white" level="H" />
          </div>

          <div style={{
            background: '#F8FFFE', borderRadius: 16, padding: 20,
            border: `1.5px solid ${ACCENT}20`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>QR fijo del negocio</div>
            <div style={{ fontSize: 12, color: '#0A1A1460', marginBottom: 14, lineHeight: 1.5 }}>
              Este QR apunta a la página de tu negocio. Imprímelo o compártelo para que los clientes vean el programa de puntos.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={downloadQR}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                  borderRadius: 9, border: '1.5px solid #0A1A1415', background: 'transparent',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#0A1A14'
                }}
              >
                <Icon name="download" size={13} color="#0A1A14" /> Descargar QR
              </button>
              <button
                onClick={copyLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                  borderRadius: 9, border: 'none', background: copied ? ACCENT + '20' : ACCENT + '15',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  color: ACCENT, transition: 'all 0.2s'
                }}
              >
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
