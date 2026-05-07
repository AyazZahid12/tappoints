'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const C = {
  sidebar: '#0D2B1F',
  green: '#1D9E75',
  sideText: '#C8E6DB',
  sideMuted: '#6EA88E',
  sideActiveBg: 'rgba(29,158,117,0.18)',
  bg: '#E1F5EE',
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', href: '/admin/dashboard' },
  { id: 'negocios', label: 'Negocios', icon: 'shop', href: '/admin/negocios' },
  { id: 'expositores', label: 'Expositores NFC', icon: 'nfc', href: '/admin/expositores' },
  { id: 'estadisticas', label: 'Estadísticas', icon: 'chart', href: '/admin/estadisticas' },
  { id: 'soporte', label: 'Soporte', icon: 'support', href: '/admin/soporte' },
  { id: 'notificaciones', label: 'Notificaciones', icon: 'bell', href: '/admin/notificaciones' },
]

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  negocios: 'Negocios',
  expositores: 'Expositores NFC',
  estadisticas: 'Estadísticas',
  soporte: 'Soporte',
  notificaciones: 'Notificaciones',
}

function AdminIcon({ name, size = 17, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: '1.8',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  const icons: Record<string, React.ReactNode> = {
    grid: <svg {...s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    shop: <svg {...s}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    nfc: <svg {...s}><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M8.5 14.5a5 5 0 0 1 0-5"/><path d="M11 16a7 7 0 0 1 0-8"/><path d="M13.5 17.5a9 9 0 0 1 0-11"/></svg>,
    chart: <svg {...s}><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>,
    support: <svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    bell: <svg {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    chevron: <svg {...s} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
    logout: <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    back: <svg {...s}><polyline points="15 18 9 12 15 6"/></svg>,
  }
  return <>{icons[name] || null}</>
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const activeId = NAV_ITEMS.find(i =>
    i.href === '/admin/dashboard' ? pathname === '/admin/dashboard' : pathname.startsWith(i.href)
  )?.id || 'dashboard'

  const sectionLabel = SECTION_LABELS[activeId] || 'Admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar-panel${sidebarOpen ? ' sidebar-open' : ''}`} style={{
        width: 240, minWidth: 240, background: C.sidebar, display: 'flex',
        flexDirection: 'column', padding: 0, zIndex: 10,
        height: '100vh', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: C.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>⚡</div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>TapPoints</div>
              <div style={{
                display: 'inline-block', marginTop: 3,
                background: 'rgba(29,158,117,0.2)', color: C.green,
                fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
              }}>Superadmin</div>
            </div>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeId === item.id
            return (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }} onClick={() => setSidebarOpen(false)}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: isActive ? C.sideActiveBg : 'transparent',
                  color: isActive ? C.green : C.sideMuted,
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  marginBottom: 2, transition: 'all 0.15s ease',
                  position: 'relative',
                }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 20, background: C.green, borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <AdminIcon name={item.icon} size={17} color={isActive ? C.green : C.sideMuted} />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
              color: C.sideMuted, fontSize: 13, marginBottom: 4,
              transition: 'color 0.15s',
            }}>
              <AdminIcon name="back" size={15} color={C.sideMuted} />
              Volver al panel
            </div>
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 13,
              fontFamily: 'inherit', transition: 'color 0.15s',
            }}
          >
            <AdminIcon name="logout" size={15} color="rgba(255,255,255,0.3)" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>
        <div
          className="dashboard-topbar"
          style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 32px', background: C.bg,
            borderBottom: '1px solid rgba(10,26,20,0.06)', flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0D2B1F' }}>{sectionLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'rgba(29,158,117,0.1)', color: C.green,
              fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99,
            }}>
              SuperAdmin · tappointsboss@gmail.com
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
