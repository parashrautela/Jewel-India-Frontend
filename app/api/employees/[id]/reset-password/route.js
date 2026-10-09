import { NextResponse } from "next/server";
import { callStaffAccounts, staffAccountsResponse } from "../../../../../lib/supabase/staff-accounts";

export const runtime = 'nodejs';

/**
 * POST /api/employees/[id]/reset-password
 *
 * Gives a password login a new password through the staff-accounts service
 * (which checks the employee belongs to the caller's store). The password
 * comes back once and is stored nowhere; there is no "forgot password" for
 * staff, the owner does this instead.
 * Returns: { ok, employee, password } or { error }
 */
export async function POST(request, context) {
  try {
    const { id } = await context.params;
    return staffAccountsResponse(await callStaffAccounts("reset_password", { employee_id: id }));
  } catch (error) {
    console.error("Reset employee password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
