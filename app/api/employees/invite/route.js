import { NextResponse } from "next/server";
import { callStaffAccounts, staffAccountsResponse } from "../../../../lib/supabase/staff-accounts";
import { isValidEmailFormat, validateIndianMobile } from "../../../../lib/utils/credentials";

export const runtime = 'nodejs';

/**
 * POST /api/employees/invite
 * Body: { full_name, email, designation?, phone? }
 *
 * Invites a Google address to the store. The row waits as 'invited' until
 * that person signs in with Google and claim_staff_invite() links it.
 * Returns: { ok, employee } or { error }
 */
export async function POST(request) {
  try {
    const { full_name, email, designation, phone } = await request.json();

    const fullName = typeof full_name === "string" ? full_name.trim() : "";
    const emailValue = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!isValidEmailFormat(emailValue)) {
      return NextResponse.json({ error: "Enter the Google email address they sign in with." }, { status: 400 });
    }

    let phoneValue = null;
    if (typeof phone === "string" && phone.trim().length > 0) {
      const mobileCheck = validateIndianMobile(phone.trim());
      if (!mobileCheck.valid) {
        return NextResponse.json(
          { error: "Please provide a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
      phoneValue = mobileCheck.normalized;
    }

    const payload = { full_name: fullName, email: emailValue };
    if (typeof designation === "string" && designation.trim()) {
      payload.designation = designation.trim();
    }
    if (phoneValue) payload.phone = phoneValue;

    return staffAccountsResponse(await callStaffAccounts("invite_google", payload));
  } catch (error) {
    console.error("Invite employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
