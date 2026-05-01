import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === 'tappointsboss@gmail.com' ? user : null
}

export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  const [
    { data: negocio },
    { data: clientes },
    { data: cupones },
  ] = await Promise.all([
    admin.from('negocios').select('user_id, slug').eq('id', id).single(),
    admin.from('clientes').select('id, nombre, puntos, nivel, visitas, ultima_visita').eq('negocio_id', id).order('puntos', { ascending: false }).limit(20),
    admin.from('cupones').select('id, canjeado, created_at').eq('negocio_id', id),
  ])

  let ownerEmail = ''
  let lastSignIn = ''
  if (negocio?.user_id) {
    const { data: { user: owner } } = await admin.auth.admin.getUserById(negocio.user_id)
    ownerEmail = owner?.email ?? ''
    lastSignIn = owner?.last_sign_in_at ?? ''
  }

  return NextResponse.json({
    ownerEmail,
    lastSignIn,
    slug: negocio?.slug ?? '',
    clientes: clientes ?? [],
    cuponesGenerados: cupones?.length ?? 0,
    cuponesCanjeados: cupones?.filter(c => c.canjeado).length ?? 0,
  })
}

export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  await admin.from('visitas').delete().eq('negocio_id', id)
  await admin.from('cupones').delete().eq('negocio_id', id)
  await admin.from('clientes').delete().eq('negocio_id', id)
  const { error } = await admin.from('negocios').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
