import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { callStaffAccounts, staffAccountsResponse } from "../../../../lib/supabase/staff-accounts";
import { DB_MESSAGES } from "../../../../lib/utils/dbMessages";

// The employee, if it belongs to the caller's store; otherwise the response to send.
async function loadOwnEmployee(supabase, id) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: retailer } = await supabase
    .from("retailers")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!retailer) {
    return { response: NextResponse.json({ error: "Retailer profile not found" }, { status: 404 }) };
  }

  // Ensure the employee belongs to this retailer
  const { data: employee, error: checkError } = await supabase
    .from("employees")
    .select("id, retailer_id, status, join_method, is_system_generated")
    .eq("id", id)
    .single();

  if (checkError || !employee || employee.retailer_id !== retailer.id) {
    return { response: NextResponse.json({ error: "Employee not found or access denied" }, { status: 404 }) };
  }

  return { employee };
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const supabase = await createClient();
    const { employee, response } = await loadOwnEmployee(supabase, id);
    if (response) return response;

    // Status changes go through the staff-accounts service: switching someone
    // off also bans their login. The owner's own row is never switched.
    let serviceEmployee = null;
    if (body.status !== undefined) {
      if (employee.is_system_generated) {
        return NextResponse.json(
          { error: "The store owner's own row can't be switched off." },
          { status: 400 }
        );
      }
      if (!["active", "inactive"].includes(body.status)) {
        return NextResponse.json({ error: "Status must be active or inactive." }, { status: 400 });
      }
      const result = await callStaffAccounts("set_status", { employee_id: id, status: body.status });
      if (!result.body?.ok) return staffAccountsResponse(result);
      serviceEmployee = result.body.employee;
    }

    const updates = {};
    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.designation !== undefined) updates.designation = body.designation;
    if (body.phone !== undefined) updates.phone = body.phone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ data: serviceEmployee ?? employee });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedEmployee, error: updateError } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedEmployee });

  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { employee, response } = await loadOwnEmployee(supabase, id);
    if (response) return response;

    if (employee.is_system_generated) {
      return NextResponse.json({ error: DB_MESSAGES.CANNOT_DELETE_STORE_OWNER_ROW }, { status: 400 });
    }

    // An invitation nobody accepted is cancelled; a login goes with its row.
    const action = employee.status === "invited" ? "cancel_invite" : "remove";
    const result = await callStaffAccounts(action, { employee_id: id });
    if (!result.body?.ok) return staffAccountsResponse(result);

    return NextResponse.json({ success: true, removed: result.body.removed ?? true });

  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
