import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ConfiguracionClient from './ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nombre, slug, descripcion')
    .eq('user_id', user.id)
    .single()

  if (!negocio) redirect('/auth')

  return (
    <ConfiguracionClient negocio={negocio} />
  )
}
