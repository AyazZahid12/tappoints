'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const ACCENT = '#1D9E75'
const DARK = '#0A1A14'

interface Negocio {
  id: string
  nombre: string
  recompensa: string
  puntos_para_recompensa: number
  puntos_por_visita: number
}

export default function ScanClient({ negocio }: { negocio: Negocio; slug: string }) {
  const [phone, setPhone] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [qrPhone, setQrPhone] = useState('')

  function handleGetQR(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = phone.trim().replace(/\s+/g, '')
    if (!cleaned) return
    setQrPhone(cleaned)
    setShowQR(true)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#E1F5EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 8px 24px #1D9E7540',
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: '-0.03em' }}>
            {negocio.nombre}
          </h1>
          <p style={{ fontSize: 14, color: `${DARK}60`, marginTop: 6 }}>
            Programa de fidelización
          </p>
        </div>

        {/* Program info card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: ACCENT + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
                <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: DARK }}>
              Acumula puntos y gana premios
            </h2>
            <p style={{ fontSize: 13, color: `${DARK}60`, marginTop: 8, lineHeight: 1.6 }}>
              Muestra tu código QR personal al empleado en cada visita para sumar{' '}
              <strong style={{ color: ACCENT }}>{negocio.puntos_por_visita} punto</strong>.
            </p>
          </div>

          <div style={{
            background: ACCENT + '10', borderRadius: 14, padding: 20,
            border: `1.5px solid ${ACCENT}20`,
          }}>
            <div style={{ fontSize: 13, color: `${DARK}60`, marginBottom: 4 }}>Recompensa al llegar a</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: ACCENT, letterSpacing: '-0.04em' }}>
              {negocio.puntos_para_recompensa} puntos
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginTop: 6 }}>
              🎁 {negocio.recompensa}
            </div>
          </div>
        </div>

        {/* Personal QR card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {!showQR ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: ACCENT + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="5" height="5" rx="0.5"/><rect x="16" y="3" width="5" height="5" rx="0.5"/>
                    <rect x="3" y="16" width="5" height="5" rx="0.5"/><path d="M16 16h5v5"/><path d="M16 16v5"/>
                    <path d="M4.5 4.5h2v2h-2z"/><path d="M17.5 4.5h2v2h-2z"/><path d="M4.5 17.5h2v2h-2z"/>
                    <path d="M12 3v5"/><path d="M3 12h5"/><path d="M12 12h5"/><path d="M12 16v5"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: DARK }}>Mi código QR personal</h2>
                <p style={{ fontSize: 13, color: `${DARK}60`, marginTop: 6, lineHeight: 1.5 }}>
                  Introduce tu teléfono para generar tu código QR. El empleado lo escaneará para sumarte puntos.
                </p>
              </div>

              <form onSubmit={handleGetQR} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="6XX XXX XXX"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '1.5px solid #0A1A1415', fontSize: 15, fontFamily: 'inherit',
                    outline: 'none', color: DARK, background: '#FAFAFA', textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                    background: ACCENT, color: 'white', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: `0 4px 16px ${ACCENT}40`,
                  }}
                >
                  Ver mi código QR
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 6 }}>Tu código QR</h2>
              <p style={{ fontSize: 13, color: `${DARK}55`, marginBottom: 20, lineHeight: 1.5 }}>
                Muestra este código al empleado para sumar tus puntos
              </p>

              <div style={{
                display: 'inline-flex', padding: 16, background: 'white',
                borderRadius: 16, border: `2px solid ${ACCENT}25`,
                boxShadow: `0 4px 20px ${ACCENT}20`, margin: '0 auto 20px',
              }}>
                <QRCodeSVG value={qrPhone} size={180} level="M" />
              </div>

              <div style={{
                background: ACCENT + '10', borderRadius: 10, padding: '10px 16px',
                fontSize: 13, color: `${DARK}70`, marginBottom: 16,
              }}>
                Teléfono: <strong style={{ color: DARK }}>{qrPhone}</strong>
              </div>

              <p style={{ fontSize: 12, color: `${DARK}45`, marginBottom: 16, lineHeight: 1.5 }}>
                Guarda una captura de pantalla para no tener que introducir tu número cada vez.
              </p>

              <button
                onClick={() => { setShowQR(false); setPhone('') }}
                style={{
                  background: 'none', border: `1.5px solid ${DARK}15`, borderRadius: 10,
                  padding: '10px 20px', fontSize: 13, color: `${DARK}60`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cambiar teléfono
              </button>
            </>
          )}
        </div>

        <p style={{ fontSize: 12, color: `${DARK}40`, marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}
