import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin.js";
import { getRequestUser } from "../../../../lib/supabase/request-user.js";

export const runtime = "nodejs";

/**
 * Native retailer onboarding writes its own RLS-protected retailer row, then
 * calls this service-role endpoint to attach the referral transactionally.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await getRequestUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized — please sign in." }, { status: 401 });
    }

    if (user.user_metadata?.role !== "retailer") {
      return NextResponse.json(
        { error: "Only a retailer account can accept this invitation." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) {
      return NextResponse.json({ error: "Invitation code is required." }, { status: 400 });
    }

    const { data: claim, error: claimError } = await supabaseAdmin.rpc(
      "claim_retailer_referral",
      { p_code: code, p_retailer_user: user.id }
    );

    if (claimError) {
      console.error("[referral/claim] RPC error:", claimError.message);
      return NextResponse.json({ error: "Could not accept the invitation." }, { status: 500 });
    }

    if (!claim?.ok) {
      const messages = {
        INVITATION_NOT_FOUND: "This invitation does not exist.",
        INVITATION_INACTIVE: "This invitation is no longer active.",
        INVITATION_EXPIRED: "This invitation expired after seven days.",
        INVITATION_ALREADY_USED: "This invitation has already been used.",
        RETAILER_ALREADY_ATTRIBUTED: "This retailer account already has an inviter.",
        INVITATION_NOT_ATTACHED: "Existing retailer accounts cannot accept a new invitation.",
      };
      return NextResponse.json(
        { error: messages[claim.error] || "This invitation cannot be accepted.", reason: claim.error },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, replayed: claim.replayed === true });
  } catch (error) {
    console.error("[referral/claim] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
