import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardShell from './DashboardShell'

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
    <DashboardShell businessName={businessName} initials={initials}>
      {children}
    </DashboardShell>
  )
}
