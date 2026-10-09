import { NextResponse } from "next/server";
import { callStaffAccounts, staffAccountsResponse } from "../../../../lib/supabase/staff-accounts";

export const runtime = 'nodejs';

/**
 * POST /api/employees/generate-email
 * Body: { full_name }
 *
 * Asks the staff-accounts service for a free username for this store.
 * Returns: { ok, username, email, domain } — `username` is the editable part
 * before the domain, `email` the full login.
 */
export async function POST(request) {
  try {
    const { full_name } = await request.json();

    const fullName = typeof full_name === "string" ? full_name.trim() : "";
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const result = await callStaffAccounts("suggest", { full_name: fullName });
    if (!result.body?.ok) {
      return staffAccountsResponse(result);
    }

    const { username, email, domain } = result.body;
    return NextResponse.json({ ok: true, username, email, domain });
  } catch (error) {
    console.error("Generate email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
