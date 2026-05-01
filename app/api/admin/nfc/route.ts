import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'tappointsboss@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, status } = await req.json()
  const admin = createAdminClient()
  const extra = status === 'enviado'
    ? { sent_at: new Date().toISOString() }
    : { delivered_at: new Date().toISOString() }
  const { error } = await admin.from('expositores_nfc').update({ status, ...extra }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
