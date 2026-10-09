import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/utils/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: retailers, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  const referredByIds = [...new Set((retailers ?? []).map((r) => r.referred_by).filter(Boolean))]

  let wholesalerMap = new Map()
  if (referredByIds.length > 0) {
    const { data: wholesalers } = await supabaseAdmin
      .from('wholesalers')
      .select('id, business_name, full_name, email')
      .in('id', referredByIds)

    wholesalerMap = new Map((wholesalers ?? []).map((w) => [w.id, w]))
  }

  const data = (retailers ?? []).map((retailer) => ({
    ...retailer,
    referred_wholesaler: retailer.referred_by
      ? wholesalerMap.get(retailer.referred_by) ?? null
      : null,
  }))

  return NextResponse.json({ data })
}
