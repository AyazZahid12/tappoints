'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const ACCENT = '#1D9E75'

interface Props {
  businessName: string
  initials: string
  children: React.ReactNode
}

export default function DashboardShell({ businessName, initials, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar whenever the route changes (user tapped a nav link)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Lock body scroll while sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        businessName={businessName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#E1F5EE' }}>
        {/* Top bar */}
        <div
          className="dashboard-topbar"
          style={{
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '0 32px', background: '#E1F5EE',
            borderBottom: '1px solid #0A1A1410', flexShrink: 0,
          }}
        >
          {/* Hamburger — visible on mobile only via CSS */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
            <span style={{ fontSize: 12, color: '#0A1A1460' }}>Sistema activo</span>
            <div style={{
              marginLeft: 12, width: 34, height: 34, borderRadius: '50%',
              background: ACCENT + '25', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: ACCENT,
            }}>
              {initials}
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
