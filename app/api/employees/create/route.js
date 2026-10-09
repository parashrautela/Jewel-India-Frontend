import { NextResponse } from "next/server";
import { callStaffAccounts, staffAccountsResponse } from "../../../../lib/supabase/staff-accounts";
import { validateIndianMobile } from "../../../../lib/utils/credentials";

export const runtime = 'nodejs';

/**
 * POST /api/employees/create
 * Body: { full_name, username?, designation?, phone? }
 *
 * Creates a password login through the staff-accounts service, which runs
 * as the calling store owner. The password comes back once, in the reply,
 * and is stored nowhere.
 * Returns: { ok, employee, password } or { error }
 */
export async function POST(request) {
  try {
    const { full_name, username, designation, phone } = await request.json();

    const fullName = typeof full_name === "string" ? full_name.trim() : "";
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
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

    const payload = { full_name: fullName };
    // The username is the part before the domain; the service appends its own.
    if (typeof username === "string" && username.trim()) {
      payload.username = username.trim().toLowerCase().split("@")[0];
    }
    if (typeof designation === "string" && designation.trim()) {
      payload.designation = designation.trim();
    }
    if (phoneValue) payload.phone = phoneValue;

    return staffAccountsResponse(await callStaffAccounts("create", payload));
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
