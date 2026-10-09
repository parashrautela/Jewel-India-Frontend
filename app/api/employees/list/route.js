import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!retailer) {
      return NextResponse.json({ error: "Retailer profile not found" }, { status: 404 });
    }
    const { data: employees, error: fetchError } = await supabase
      .from("employees")
      .select(
        "id, retailer_id, auth_user_id, full_name, email, invite_email, personal_email, phone, designation, status, is_active, join_method, is_system_generated, created_by, invited_at, activated_at, last_active_at, created_at, updated_at"
      )
      .eq("retailer_id", retailer.id)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ data: employees });
  } catch (error) {
    console.error("List employees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
