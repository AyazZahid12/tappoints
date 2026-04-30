import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const token = crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 30_000).toISOString()

  const { error } = await supabase.from('qr_tokens').insert({
    token,
    negocio_id: negocio.id,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: 'Error al crear token' }, { status: 500 })

  return NextResponse.json({ token, expiresAt })
}
