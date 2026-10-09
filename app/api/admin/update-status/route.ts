import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/utils/adminAuth'
import { DB_MESSAGES } from '@/lib/utils/dbMessages'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const {
    id,
    type = 'wholesaler',
    verification_status,
    rejection_reason,
    rejected_documents,
    admin_notes,
    notification_message,
    notified
  } = body
  if (!id || !verification_status) {
    return NextResponse.json(
      { error: 'id and verification_status are required' },
      { status: 400 }
    )
  }

  const table = type === 'retailer' ? 'retailers' : 'wholesalers'

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({
      verification_status,
      rejection_reason: rejection_reason ?? null,
      rejected_documents: rejected_documents ?? [],
      admin_notes: admin_notes ?? null,
      notification_message: notification_message ?? null,
      notified: notified ?? false
    })
    .eq('id', id)
    .select()

  if (error) {
    // Nobody is verified without an inviter — the retailer has to add their code first.
    if (error.message?.includes('RETAILER_HAS_NO_INVITER')) {
      return NextResponse.json(
        { error: DB_MESSAGES.RETAILER_HAS_NO_INVITER, code: 'RETAILER_HAS_NO_INVITER' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
