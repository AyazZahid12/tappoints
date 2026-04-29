'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Icon from './Icon'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { id: 'clientes', label: 'Clientes', icon: 'clients', href: '/dashboard/clientes' },
  { id: 'programa', label: 'Programa', icon: 'program', href: '/dashboard/programa' },
  { id: 'qr', label: 'Mi QR / NFC', icon: 'qr', href: '/dashboard/qr' },
  { id: 'cupones', label: 'Cupones', icon: 'coupons', href: '/dashboard/cupones' },
]

const ACCENT = '#1D9E75'

interface SidebarProps {
  businessName: string
}

export default function Sidebar({ businessName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const active = NAV_ITEMS.find(i =>
    i.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.href)
  )?.id || 'dashboard'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <aside style={{
      width: 240, minWidth: 240, background: '#0A1A14', display: 'flex',
      flexDirection: 'column', padding: 0, position: 'relative', zIndex: 10,
      height: '100vh', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #ffffff10' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="coin" size={18} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>TapPoints</div>
            <div style={{ color: '#ffffff50', fontSize: 11, marginTop: 1 }}>{businessName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: isActive ? ACCENT + '22' : 'transparent',
                color: isActive ? ACCENT : '#ffffff70',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s ease',
                position: 'relative'
              }}>
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 20, background: ACCENT, borderRadius: '0 3px 3px 0'
                  }} />
                )}
                <Icon name={item.icon} size={17} color={isActive ? ACCENT : '#ffffff70'} />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #ffffff10' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#ffffff40', fontSize: 13,
            fontFamily: 'inherit', transition: 'color 0.15s'
          }}
        >
          <Icon name="logout" size={16} color="#ffffff40" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
