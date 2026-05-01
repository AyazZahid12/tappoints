import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'tappointsboss@gmail.com') redirect('/auth')

  return <AdminShell>{children}</AdminShell>
}
