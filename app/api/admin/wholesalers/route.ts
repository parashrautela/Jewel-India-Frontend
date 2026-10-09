import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/utils/adminAuth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('wholesalers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
