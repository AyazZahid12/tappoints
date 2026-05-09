'use client'

import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'
const DARK = '#0A1A14'

interface Props {
  businessName: string
  slug: string
  appUrl: string
}

export default function QRClient({ businessName, slug, appUrl }: Props) {
  const url = `${appUrl}/${slug}`
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  function downloadQR() {
    const canvas = canvasWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const png = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = png
    a.download = `tappoints-qr-${slug}.png`
    a.click()
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } catch {
      // fallback for browsers without clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fade-up" style={{ padding: 32, height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: DARK }}>Mi QR del negocio</h1>
        <p style={{ color: `${DARK}60`, fontSize: 14, marginTop: 4 }}>
          Imprime o muestra este código a tus clientes para que accedan a su tarjeta de puntos
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, maxWidth: 840, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* QR card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          flexShrink: 0,
        }}>
          {/* QRCodeCanvas renders a <canvas> so toDataURL() works directly */}
          <div ref={canvasWrapRef} style={{
            padding: 16, background: 'white', borderRadius: 12,
            border: `2px solid ${DARK}10`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <QRCodeCanvas
              value={url}
              size={200}
              fgColor={DARK}
              bgColor="white"
              level="H"
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{businessName}</div>
            <div style={{ fontSize: 11, color: `${DARK}45`, marginTop: 4, wordBreak: 'break-all', maxWidth: 240 }}>
              {url}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              onClick={downloadQR}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none',
                background: ACCENT, color: 'white', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: `0 3px 12px ${ACCENT}40`,
              }}
            >
              <Icon name="download" size={14} color="white" />
              Descargar PNG
            </button>
            <button
              onClick={copyLink}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10,
                border: `1.5px solid ${DARK}15`,
                background: copied ? ACCENT + '15' : 'transparent',
                color: copied ? ACCENT : `${DARK}70`,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar enlace'}
            </button>
          </div>
        </div>

        {/* Instructions + tip */}
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: DARK, marginBottom: 14 }}>Cómo funciona</div>
            {[
              { title: 'Imprime o muestra el QR', body: 'Colócalo en el mostrador o en un lugar visible del negocio.' },
              { title: 'El cliente lo escanea', body: 'Abre su tarjeta de puntos personalizada directamente en su móvil.' },
              { title: 'El empleado suma puntos', body: 'Con el escáner de la app, lee el QR personal del cliente y los puntos se suman solos.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: ACCENT + '15', color: ACCENT,
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: `${DARK}55`, marginTop: 2, lineHeight: 1.5 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: ACCENT + '12', borderRadius: 14, padding: 18,
            border: `1.5px solid ${ACCENT}25`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, marginBottom: 6 }}>💡 Consejo</div>
            <div style={{ fontSize: 13, color: `${DARK}70`, lineHeight: 1.6 }}>
              Descarga el PNG e imprímelo en un cartel de mostrador o añádelo a la carta. Los clientes solo necesitan escanearlo una vez — después usan su propio QR personal.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
