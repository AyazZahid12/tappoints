import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import QRClient from './QRClient'

export default async function QRPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('nombre, slug')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tappoints.com'

  return <QRClient businessName={negocio.nombre} appUrl={appUrl} slug={negocio.slug} />
}
