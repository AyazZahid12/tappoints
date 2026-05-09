'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase'

const G = '#1D9E75'
const DARK = '#0A1A14'
const BG = '#E1F5EE'

interface Programa {
  id: string
  nombre: string
  puntos_por_visita: number
  puntos_para_recompensa: number
  recompensa: string
}

interface Props {
  negocioNombre: string
  negocioId: string
  slug: string
  programas: Programa[]
  isAtLimit: boolean
}

interface Stored {
  nombre: string
  telefono: string
}

type View = 'loading' | 'qr' | 'register' | 'recover'

const lsKey = (slug: string) => `tappoints_${slug}_v1`

export default function ScanClient({ negocioNombre, negocioId, slug, programas, isAtLimit }: Props) {
  const prog = programas[0]

  const [view, setView] = useState<View>('loading')
  const [stored, setStored] = useState<Stored | null>(null)
  const [puntos, setPuntos] = useState<number | null>(null)

  // form fields
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [recoverTel, setRecoverTel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // +N animation
  const [plusAnim, setPlusAnim] = useState(false)
  const prevPts = useRef<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Init: check localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(slug))
      if (raw) {
        const data = JSON.parse(raw) as Stored
        setStored(data)
        setView('qr')
        return
      }
    } catch {}
    setView('register')
  }, [slug])

  // ── Poll for points when QR is visible ────────────────────────────────────
  useEffect(() => {
    if (view !== 'qr' || !stored) return
    const supabase = createClient()

    async function poll() {
      const { data } = await supabase
        .from('clientes')
        .select('puntos')
        .eq('negocio_id', negocioId)
        .eq('telefono', stored!.telefono)
        .single()
      if (!data) return
      if (prevPts.current !== null && data.puntos > prevPts.current) {
        setPlusAnim(true)
        setTimeout(() => setPlusAnim(false), 1500)
      }
      prevPts.current = data.puntos
      setPuntos(data.puntos)
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [view, stored, negocioId])

  // ── Register ───────────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const nom = nombre.trim()
    const tel = telefono.trim().replace(/\s+/g, '')
    if (!nom || !tel) return
    setBusy(true); setErr('')

    const supabase = createClient()

    const { data: existing } = await supabase
      .from('clientes')
      .select('id, qr_personal_id')
      .eq('negocio_id', negocioId)
      .eq('telefono', tel)
      .single()

    if (existing) {
      if (!existing.qr_personal_id) {
        await supabase.from('clientes')
          .update({ qr_code: tel, qr_personal_id: crypto.randomUUID() })
          .eq('id', existing.id)
      }
    } else {
      const { error: insertErr } = await supabase.from('clientes').insert({
        negocio_id: negocioId,
        nombre: nom,
        telefono: tel,
        puntos: 0,
        visitas: 0,
        nivel: 'nuevo',
        qr_code: tel,
        qr_personal_id: crypto.randomUUID(),
      })
      if (insertErr) {
        setErr('Error al registrarte. Intenta de nuevo.')
        setBusy(false)
        return
      }
    }

    const data: Stored = { nombre: nom, telefono: tel }
    localStorage.setItem(lsKey(slug), JSON.stringify(data))
    setStored(data)
    setView('qr')
    setBusy(false)
  }

  // ── Recover ────────────────────────────────────────────────────────────────
  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    const tel = recoverTel.trim().replace(/\s+/g, '')
    if (!tel) return
    setBusy(true); setErr('')

    const supabase = createClient()
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, qr_personal_id')
      .eq('negocio_id', negocioId)
      .eq('telefono', tel)
      .single()

    if (!cliente) {
      setErr('No encontramos una cuenta con ese teléfono.')
      setBusy(false)
      return
    }

    // Ensure qr fields are set
    if (!cliente.qr_personal_id) {
      await supabase.from('clientes')
        .update({ qr_code: tel, qr_personal_id: crypto.randomUUID() })
        .eq('id', cliente.id)
    }

    const data: Stored = { nombre: cliente.nombre, telefono: cliente.telefono }
    localStorage.setItem(lsKey(slug), JSON.stringify(data))
    setStored(data)
    setView('qr')
    setBusy(false)
  }

  // ── QR view ────────────────────────────────────────────────────────────────
  if (view === 'qr' && stored) {
    const pts = puntos ?? 0
    const meta = prog.puntos_para_recompensa
    const pct = Math.min((pts / meta) * 100, 100)
    const faltan = Math.max(0, meta - pts)

    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Logo size={48} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: DARK, marginTop: 10, letterSpacing: '-0.03em' }}>
              {negocioNombre}
            </h1>
            <p style={{ fontSize: 13, color: `${DARK}55`, marginTop: 3 }}>
              Hola, <strong>{stored.nombre}</strong>
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 24, padding: '28px 24px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: `${DARK}50`, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Tu código QR personal
            </p>

            <div style={{ display: 'inline-block', padding: 14, background: 'white', borderRadius: 16, border: `2px solid ${G}25`, boxShadow: `0 4px 20px ${G}15`, marginBottom: 24 }}>
              <QRCodeSVG value={stored.telefono} size={176} fgColor={DARK} bgColor="white" level="H" />
            </div>

            <div style={{ position: 'relative', marginBottom: 20 }}>
              {plusAnim && (
                <div style={{
                  position: 'absolute', top: -28, left: '50%',
                  fontSize: 20, fontWeight: 800, color: G, pointerEvents: 'none',
                  animation: 'floatUp 1.4s ease forwards',
                }}>
                  +{prog.puntos_por_visita}
                </div>
              )}
              <div style={{ fontSize: 44, fontWeight: 800, color: G, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {puntos ?? '—'}
              </div>
              <div style={{ fontSize: 13, color: `${DARK}50`, marginTop: 4 }}>puntos acumulados</div>
            </div>

            <div>
              <div style={{ width: '100%', height: 10, background: `${DARK}0D`, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: G, borderRadius: 99,
                  transition: 'width 0.7s ease', boxShadow: `0 0 8px ${G}60`,
                }} />
              </div>
              <div style={{ fontSize: 13, color: `${DARK}55`, marginTop: 10, lineHeight: 1.5 }}>
                {faltan === 0
                  ? <span style={{ color: G, fontWeight: 700 }}>🎉 ¡Has ganado tu recompensa!</span>
                  : <>Te faltan <strong style={{ color: G }}>{faltan} puntos</strong> para: {prog.recompensa}</>}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setView('recover'); setErr(''); setRecoverTel('') }}
            style={linkBtnStyle}
          >
            ¿Cambiaste de dispositivo?
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: `${DARK}30`, marginTop: 10 }}>Powered by TapPoints 💚</p>
        </div>

        <style>{`
          @keyframes floatUp {
            0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-36px); }
          }
        `}</style>
      </div>
    )
  }

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 30, height: 30, border: `3px solid ${G}30`, borderTopColor: G, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Limit reached (only blocks new registrations) ─────────────────────────
  if (isAtLimit && view === 'register') {
    return (
      <PageShell negocioNombre={negocioNombre}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 10 }}>Límite de clientes alcanzado</h2>
          <p style={{ fontSize: 14, color: `${DARK}60`, lineHeight: 1.7 }}>
            Este negocio ha alcanzado su límite de clientes. Contacta con el negocio para más información.
          </p>
          <button onClick={() => { setView('recover'); setErr('') }} style={{ ...linkBtnStyle, marginTop: 16 }}>
            ¿Ya eres cliente? Recupera tu QR
          </button>
        </div>
      </PageShell>
    )
  }

  // ── Register / Recover forms ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Logo size={56} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: '-0.03em', marginTop: 12 }}>{negocioNombre}</h1>
          <p style={{ fontSize: 14, color: `${DARK}60`, marginTop: 6 }}>Programa de fidelización</p>
        </div>

        {/* Program info */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {programas.length > 1 ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 4 }}>Programas disponibles</h2>
              <p style={{ fontSize: 13, color: `${DARK}60`, marginBottom: 20, lineHeight: 1.5 }}>Regístrate para obtener tu tarjeta de puntos</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {programas.map(p => (
                  <div key={p.id || p.nombre} style={{ background: '#F8FFFE', borderRadius: 14, padding: '16px 18px', border: `1.5px solid ${G}20` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 10 }}>{p.nombre}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Chip label="Pts / visita" value={String(p.puntos_por_visita)} />
                      <Chip label="Meta" value={String(p.puntos_para_recompensa)} />
                      <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', flex: 2, border: `1px solid ${G}15` }}>
                        <div style={{ fontSize: 10, color: `${DARK}60`, marginBottom: 1 }}>Recompensa</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>🎁 {p.recompensa}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: G + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
                    <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: DARK }}>Acumula puntos y gana premios</h2>
                <p style={{ fontSize: 13, color: `${DARK}60`, marginTop: 8, lineHeight: 1.6 }}>
                  Muestra tu código QR al empleado en cada visita para sumar{' '}
                  <strong style={{ color: G }}>{prog.puntos_por_visita} punto</strong> por visita.
                </p>
              </div>
              <div style={{ background: G + '10', borderRadius: 14, padding: 20, border: `1.5px solid ${G}20` }}>
                <div style={{ fontSize: 13, color: `${DARK}60`, marginBottom: 4 }}>Recompensa al llegar a</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: G, letterSpacing: '-0.04em' }}>
                  {prog.puntos_para_recompensa} puntos
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginTop: 6 }}>🎁 {prog.recompensa}</div>
              </div>
            </>
          )}
        </div>

        {/* Form card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {view === 'recover' ? (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 4 }}>Recuperar mi QR</h2>
              <p style={{ fontSize: 13, color: `${DARK}55`, marginBottom: 20 }}>
                Introduce tu teléfono para acceder a tu tarjeta
              </p>
              <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="tel" value={recoverTel} onChange={e => setRecoverTel(e.target.value)}
                  required placeholder="6XX XXX XXX" style={inputCss}
                />
                {err && <ErrBox>{err}</ErrBox>}
                <SubmitBtn disabled={busy}>{busy ? 'Buscando...' : 'Recuperar mi QR'}</SubmitBtn>
              </form>
              <button onClick={() => { setView('register'); setErr('') }} style={linkBtnStyle}>
                ← Volver al registro
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 4 }}>Crea tu tarjeta</h2>
              <p style={{ fontSize: 13, color: `${DARK}55`, marginBottom: 20 }}>
                Regístrate para obtener tu código QR personal
              </p>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelCss}>Nombre</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Tu nombre" style={inputCss} />
                </div>
                <div>
                  <label style={labelCss}>Teléfono</label>
                  <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="6XX XXX XXX" style={inputCss} />
                </div>
                {err && <ErrBox>{err}</ErrBox>}
                <SubmitBtn disabled={busy}>{busy ? 'Creando tarjeta...' : 'Crear mi tarjeta QR →'}</SubmitBtn>
              </form>
              <button onClick={() => { setView('recover'); setErr('') }} style={linkBtnStyle}>
                ¿Ya tienes cuenta? Recupera tu QR
              </button>
            </>
          )}
        </div>

        <p style={{ fontSize: 12, color: `${DARK}35`, textAlign: 'center', marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Logo({ size = 52 }: { size?: number }) {
  const r = Math.round(size * 0.28)
  const icon = Math.round(size * 0.5)
  return (
    <div style={{
      width: size, height: size, borderRadius: r, background: G,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto', boxShadow: `0 8px 24px ${G}40`,
    }}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v10M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5"/>
      </svg>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: G + '12', borderRadius: 8, padding: '8px 12px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 10, color: `${DARK}60`, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: G }}>{value}</div>
    </div>
  )
}

function PageShell({ negocioNombre, children }: { negocioNombre: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={56} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: '-0.03em', marginTop: 12 }}>{negocioNombre}</h1>
          <p style={{ fontSize: 14, color: `${DARK}60`, marginTop: 6 }}>Programa de fidelización</p>
        </div>
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {children}
        </div>
        <p style={{ fontSize: 12, color: `${DARK}35`, textAlign: 'center', marginTop: 20 }}>Powered by TapPoints 💚</p>
      </div>
    </div>
  )
}

function SubmitBtn({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled} style={{
      width: '100%', padding: '13px', borderRadius: 12, border: 'none',
      background: G, color: 'white', fontSize: 15, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      opacity: disabled ? 0.7 : 1, transition: 'opacity 0.2s',
      boxShadow: `0 4px 16px ${G}40`,
    }}>{children}</button>
  )
}

function ErrBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
      {children}
    </div>
  )
}

const inputCss: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid #0A1A1415', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', color: DARK, background: '#FAFAFA', boxSizing: 'border-box',
}

const labelCss: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: DARK, display: 'block', marginBottom: 6,
}

const linkBtnStyle: React.CSSProperties = {
  display: 'block', margin: '14px auto 0', background: 'none', border: 'none',
  fontSize: 12, color: `${DARK}45`, cursor: 'pointer', textDecoration: 'underline',
  fontFamily: 'inherit',
}
