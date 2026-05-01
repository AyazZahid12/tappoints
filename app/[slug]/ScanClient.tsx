'use client'

const ACCENT = '#1D9E75'

interface Negocio {
  id: string
  nombre: string
  recompensa: string
  puntos_para_recompensa: number
  puntos_por_visita: number
}

export default function ScanClient({ negocio, isAtLimit }: { negocio: Negocio; slug: string; isAtLimit: boolean }) {
  if (isAtLimit) {
    return (
      <div style={{ minHeight: '100vh', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px #1D9E7540' }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/></svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em' }}>{negocio.nombre}</h1>
          </div>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A1A14', marginBottom: 10 }}>Límite de clientes alcanzado</h2>
            <p style={{ fontSize: 14, color: '#0A1A1460', lineHeight: 1.7 }}>
              Este negocio ha alcanzado su límite de clientes. Contacta con el negocio para más información.
            </p>
          </div>
          <p style={{ fontSize: 12, color: '#0A1A1440', marginTop: 20 }}>Powered by TapPoints 💚</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#E1F5EE',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 8px 24px #1D9E7540'
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A1A14', letterSpacing: '-0.03em' }}>
            {negocio.nombre}
          </h1>
          <p style={{ fontSize: 14, color: '#0A1A1460', marginTop: 6 }}>
            Programa de fidelización
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: ACCENT + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
            }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
                <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A1A14' }}>
              Acumula puntos y gana premios
            </h2>
            <p style={{ fontSize: 13, color: '#0A1A1460', marginTop: 8, lineHeight: 1.6 }}>
              Cada vez que visitas {negocio.nombre}, el empleado generará un QR en el mostrador.
              Escanéalo con tu móvil para sumar{' '}
              <strong style={{ color: ACCENT }}>{negocio.puntos_por_visita} punto</strong> por visita.
            </p>
          </div>

          <div style={{
            background: ACCENT + '10', borderRadius: 14, padding: 20,
            border: `1.5px solid ${ACCENT}20`
          }}>
            <div style={{ fontSize: 13, color: '#0A1A1460', marginBottom: 4 }}>Recompensa al llegar a</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: ACCENT, letterSpacing: '-0.04em' }}>
              {negocio.puntos_para_recompensa} puntos
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0A1A14', marginTop: 6 }}>
              🎁 {negocio.recompensa}
            </div>
          </div>

          <div style={{ marginTop: 20, fontSize: 13, color: '#0A1A1460', lineHeight: 1.6 }}>
            Pide al empleado que genere un QR en el mostrador para sumar tu punto.
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#0A1A1440', marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}
