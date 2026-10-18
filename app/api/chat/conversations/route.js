import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../lib/supabase/admin";
import { assertFeature } from "../../../../lib/featureFlags.js";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.user_metadata?.role;

    let query = supabaseAdmin
      .from("conversations")
      .select(`
        *,
        product:product_id(title, processed_image_url, raw_image_url),
        employee:employee_id(full_name, retailer_id),
        retailer:retailer_id(business_name),
        wholesaler_profile:wholesaler_id(email)
      `)
      .order("updated_at", { ascending: false });

    if (role === "employee") {
      const { validateEmployeeAccess } = await import("../../../../lib/utils/auth-check");
      const authCheck = await validateEmployeeAccess(supabase);
      if (authCheck.error) {
        return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
      }
      query = query.eq("employee_id", authCheck.employeeId).eq("is_visible_to_employee", true);
    } else if (role === "wholesaler") {
      const { data: ws } = await supabase.from("wholesalers").select("id").eq("user_id", user.id).single();
      if (!ws) return NextResponse.json({ error: "Wholesaler not found" }, { status: 404 });
      query = query.eq("wholesaler_id", user.id).eq("is_visible_to_wholesaler", true); // Check against auth user ID
    } else if (role === "retailer") {
       // Retailers can see all their employees' conversations
      const { data: ret } = await supabase.from("retailers").select("id").eq("user_id", user.id).single();
      if (!ret) return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
      query = query.eq("retailer_id", ret.id);
    } else {
      return NextResponse.json({ error: "Forbidden role" }, { status: 403 });
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/chat/conversations] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { validateEmployeeAccess } = await import("../../../../lib/utils/auth-check");
    const authCheck = await validateEmployeeAccess(supabase);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Get employee details using Admin client to bypass RLS issues
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employees")
      .select("id, retailer_id")
      .eq("id", authCheck.employeeId)
      .single();

    if (empError || !employee) {
      console.error("[POST /api/chat/conversations] Employee not found. Error:", empError, user.id);
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get product using Admin client
    const { data: product, error: prodError } = await supabaseAdmin
      .from("products")
      .select("wholesaler_id") // this is auth.users.id in products table
      .eq("id", product_id)
      .single();

    if (prodError || !product) {
      console.error("[POST /api/chat/conversations] Product not found. Error:", prodError, product_id);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const isWholesalerCaller = authCheck.role === "wholesaler" || authCheck.user?.user_metadata?.role === "wholesaler";
    const blockedMsg = isWholesalerCaller
      ? "Messaging has been locked for your account by Jewel India admin. Contact support to unlock it."
      : "Messaging is not available for this supplier right now.";

    const blockedResponse = await assertFeature(
      supabaseAdmin,
      product.wholesaler_id,
      "messages",
      blockedMsg
    );
    if (blockedResponse) {
      return blockedResponse;
    }

    // Find the valid wholesaler profile for this product's owner
    const { data: wholesalerRecord, error: wsError } = await supabaseAdmin
      .from("wholesalers")
      .select("id")
      .eq("user_id", product.wholesaler_id)
      .single();

    if (wsError || !wholesalerRecord) {
      console.error("[POST /api/chat/conversations] Wholesaler record missing for user:", product.wholesaler_id);
      return NextResponse.json({ error: "Wholesaler profile is incomplete or missing" }, { status: 404 });
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("product_id", product_id)
      .eq("employee_id", employee.id)
      .single();

    if (existingConv) {
      return NextResponse.json({ data: existingConv });
    }

    // Auto-heal test data: Ensure the product owner actually has a profile row.
    // If they were created before the triggers were added, this guarantees the foreign key passes.
    await supabaseAdmin.from("profiles").upsert({
      id: product.wholesaler_id,
      email: "wholesaler_" + product.wholesaler_id.substring(0, 8) + "@jewelindia.com",
      role: "wholesaler"
    }, { onConflict: "id" }).select();

    // Create new conversation
    const { data: newConv, error: insertError } = await supabaseAdmin
      .from("conversations")
      .insert({
        product_id,
        wholesaler_id: product.wholesaler_id, // Insert the auth user ID to match the profiles constraint
        employee_id: employee.id,
        retailer_id: employee.retailer_id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ data: newConv });
  } catch (error) {
    console.error("[POST /api/chat/conversations] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
