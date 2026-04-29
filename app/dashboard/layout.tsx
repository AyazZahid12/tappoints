import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('nombre')
    .eq('user_id', user.id)
    .single()

  const businessName = negocio?.nombre || 'Mi Negocio'
  const initials = businessName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar businessName={businessName} />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#E1F5EE' }}>
        {/* Top bar */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 32px', background: '#E1F5EE', borderBottom: '1px solid #0A1A1410', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" style={{
              width: 8, height: 8, borderRadius: '50%', background: '#1D9E75'
            }} />
            <span style={{ fontSize: 12, color: '#0A1A1460' }}>Sistema activo</span>
            <div style={{
              marginLeft: 12, width: 34, height: 34, borderRadius: '50%',
              background: '#1D9E7525', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#1D9E75'
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
