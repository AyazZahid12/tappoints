'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '@/components/Icon'

const ACCENT = '#1D9E75'

export default function QRClient({ businessName, url, slug }: { businessName: string; url: string; slug: string }) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tappoints-qr-${slug}.svg`
    link.click()
  }

  return (
    <div className="fade-up" style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>Mi QR / NFC</h1>
        <p style={{ color: '#0A1A1460', fontSize: 14, marginTop: 4 }}>Comparte este código con tus clientes</p>
      </div>

      <div style={{ display: 'flex', gap: 24, maxWidth: 800 }}>
        {/* QR Card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flexShrink: 0
        }}>
          <div
            ref={qrRef}
            style={{ padding: 16, background: 'white', borderRadius: 12, border: '1.5px solid #0A1A1410' }}
          >
            <QRCodeSVG
              value={url}
              size={180}
              fgColor="#0A1A14"
              bgColor="white"
              level="H"
              imageSettings={{
                src: '',
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{businessName}</div>
            <div style={{ fontSize: 12, color: '#0A1A1450', marginTop: 4, fontFamily: 'monospace' }}>{url}</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={downloadQR}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                borderRadius: 10, border: '1.5px solid #0A1A1415', background: 'transparent',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#0A1A14'
              }}
            >
              <Icon name="download" size={14} color="#0A1A14" /> Descargar
            </button>
            <button
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                borderRadius: 10, border: 'none', background: copied ? ACCENT + '20' : ACCENT,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                color: copied ? ACCENT : 'white', transition: 'all 0.2s'
              }}
            >
              {copied ? <><Icon name="check" size={14} color={ACCENT} /> Copiado</> : 'Copiar enlace'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Cómo funciona</div>
            {[
              { n: '1', text: 'El cliente escanea el QR con su móvil', icon: 'qr' },
              { n: '2', text: 'Se registra con su nombre y teléfono', icon: 'clients' },
              { n: '3', text: 'Acumula puntos automáticamente en cada visita', icon: 'coin' },
              { n: '4', text: 'Al llegar al mínimo, se genera un cupón de recompensa', icon: 'gift' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: ACCENT + '15',
                  color: ACCENT, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{s.n}</div>
                <div style={{ fontSize: 13, color: '#0A1A1470', paddingTop: 5 }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* NFC */}
          <div style={{ background: ACCENT + '10', borderRadius: 16, padding: 20, border: `1.5px dashed ${ACCENT}30` }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon name="nfc" size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0A1A14' }}>Chip NFC disponible</div>
                <div style={{ fontSize: 12, color: '#0A1A1470', marginTop: 4, lineHeight: 1.5 }}>
                  Con el plan Pro puedes programar un chip NFC para que tus clientes acumulen puntos solo acercando el móvil. Sin app, sin escanear.
                </div>
                <button style={{
                  marginTop: 10, padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: ACCENT, color: 'white', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>Ver planes Pro →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
